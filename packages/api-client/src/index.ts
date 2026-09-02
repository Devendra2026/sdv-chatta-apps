import { describeHttpFailure } from "@workspace/types"

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
    public requestId?: string,
    public path?: string
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
  fallback: string,
  path: string,
  method = "GET"
): string {
  if (status === 429) {
    return "Too many requests. Please wait a moment and try again."
  }
  return describeHttpFailure({
    status,
    bodyMessage: json?.error?.message,
    statusText: fallback,
    method,
    path,
  })
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
        json?.error?.code ??
          (response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED"),
        formatErrorMessage(
          response.status,
          json,
          response.statusText,
          path,
          init.method ?? "GET"
        ),
        response.status,
        json?.error?.requestId,
        path
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
          json?.error?.code ??
            (response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED"),
          formatErrorMessage(response.status, json, response.statusText, path, "POST"),
          response.status,
          json?.error?.requestId,
          path
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

export type PublicApiClientOptions = {
  resolveBaseUrl: () => string
}

/**
 * Citizen web client factory. The Next.js app must supply resolveBaseUrl
 * (browser: same-origin ""; server: API_INTERNAL_URL from app env).
 */
export function createPublicApiClient(options: PublicApiClientOptions) {
  return createApiClient({
    credentials: "omit",
    resolveBaseUrl: options.resolveBaseUrl,
  })
}
