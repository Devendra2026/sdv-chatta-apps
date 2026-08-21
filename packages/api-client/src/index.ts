export type ApiClientOptions = {
  baseUrl: string
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

export function createApiClient(options: ApiClientOptions) {
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

    const response = await fetch(`${options.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    })

    const json = (await response.json().catch(() => null)) as
      | {
          success?: boolean
          data?: T
          meta?: Record<string, unknown>
          error?: { code?: string; message?: string; requestId?: string }
        }
      | null

    if (!response.ok || json?.success === false) {
      throw new ApiError(
        json?.error?.code ?? "REQUEST_FAILED",
        json?.error?.message ?? response.statusText,
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
      const response = await fetch(`${options.baseUrl}${path}`, {
        method: "POST",
        headers,
        body: form,
        credentials: "include",
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
          json?.error?.message ?? response.statusText,
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
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
