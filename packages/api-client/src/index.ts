export type ApiClientOptions = {
  baseUrl?: string
  resolveBaseUrl?: () => string
  credentials?: RequestCredentials
  getHeaders?: () => HeadersInit | Promise<HeadersInit>
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Alias used by citizen web (apps/web). */
export const PublicApiError = ApiError

function resolveRequestBaseUrl(options: ApiClientOptions): string {
  if (options.resolveBaseUrl) {
    return options.resolveBaseUrl().replace(/\/$/, "")
  }
  const configured = options.baseUrl?.trim()
  return configured ? configured.replace(/\/$/, "") : ""
}

function formatErrorMessage(
  status: number,
  json: { error?: { message?: string } } | null,
  fallback: string
): string {
  if (json?.error?.message) return json.error.message
  if (status === 429) {
    return "Too many requests. Please wait a moment and try again."
  }
  return fallback || "Request failed"
}

export function createApiClient(options: ApiClientOptions) {
  const credentials = options.credentials ?? "include"

  async function request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<{ data: T; meta?: Record<string, unknown> }> {
    const headers = new Headers(init.headers)
    headers.set("Accept", "application/json")
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
    const extra = options.getHeaders ? await options.getHeaders() : undefined
    if (extra) {
      new Headers(extra).forEach((value, key) => headers.set(key, value))
    }

    const response = await fetch(`${resolveRequestBaseUrl(options)}${path}`, {
      ...init,
      headers,
      credentials,
      cache: "no-store",
    })

    const json = (await response.json().catch(() => null)) as {
      success?: boolean
      data?: T
      meta?: Record<string, unknown>
      error?: { code?: string; message?: string; requestId?: string }
    } | null

    if (!response.ok || json?.success === false) {
      throw new ApiError(
        json?.error?.code ?? "REQUEST_FAILED",
        formatErrorMessage(response.status, json, response.statusText),
        response.status,
        json?.error?.requestId
      )
    }

    return {
      data: (json?.data ?? json) as T,
      meta: json?.meta,
    }
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    postForm: async <T>(path: string, form: FormData) => {
      const headers = new Headers()
      headers.set("Accept", "application/json")
      const extra = options.getHeaders ? await options.getHeaders() : undefined
      if (extra) {
        new Headers(extra).forEach((value, key) => headers.set(key, value))
      }
      const response = await fetch(`${resolveRequestBaseUrl(options)}${path}`, {
        method: "POST",
        headers,
        body: form,
        credentials,
        cache: "no-store",
      })
      const json = (await response.json().catch(() => null)) as {
        success?: boolean
        data?: T
        meta?: Record<string, unknown>
        error?: { code?: string; message?: string; requestId?: string }
      } | null
      if (!response.ok || json?.success === false) {
        throw new ApiError(
          json?.error?.code ?? "REQUEST_FAILED",
          formatErrorMessage(response.status, json, response.statusText),
          response.status,
          json?.error?.requestId
        )
      }
      return {
        data: (json?.data ?? json) as T,
        meta: json?.meta,
      }
    },
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "PATCH",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "PUT",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

function resolvePublicBaseUrl(): string {
  if (typeof window !== "undefined") {
    return ""
  }
  const internal = process.env.API_INTERNAL_URL?.trim()
  if (internal) return internal.replace(/\/$/, "")
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  return "http://localhost:4000"
}

/** Citizen web client — same-origin /api in browser, API_INTERNAL_URL on server. */
export function createPublicApiClient() {
  return createApiClient({
    credentials: "omit",
    resolveBaseUrl: resolvePublicBaseUrl,
  })
}

const publicClient = createPublicApiClient()

export async function publicApiGet<T>(path: string): Promise<T> {
  const { data } = await publicClient.get<T>(path)
  return data
}

export async function publicApiPost<T>(path: string, body: unknown): Promise<T> {
  const { data } = await publicClient.post<T>(path, body)
  return data
}
