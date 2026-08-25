export class PublicApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = "PublicApiError"
  }
}

/**
 * Empty base = same-origin `/api/*` (Next rewrite → Nest).
 * Set NEXT_PUBLIC_API_URL only when calling Nest on a separate public host.
 */
function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!configured) return ""
  return configured.replace(/\/$/, "")
}

async function publicApiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "omit",
  })

  const json = (await response.json().catch(() => null)) as {
    success?: boolean
    data?: T
    error?: { code?: string; message?: string }
  } | null

  if (!response.ok || json?.success === false) {
    throw new PublicApiError(
      json?.error?.code ?? "REQUEST_FAILED",
      json?.error?.message ??
        (response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : response.statusText || "Request failed"),
      response.status
    )
  }

  return (json?.data ?? json) as T
}

export function publicApiGet<T>(path: string): Promise<T> {
  return publicApiRequest<T>(path, { method: "GET" })
}

export function publicApiPost<T>(path: string, body: unknown): Promise<T> {
  return publicApiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
}
