import { describeHttpFailure } from "@workspace/types"

const RETRY_BACKOFF_MS = [200, 500]

export function apiInternalUrl() {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  )
}

export const PORTAL_API_TIMEOUT_MS = 10_000
export const PORTAL_API_MAX_RETRIES = 2

export function sanitizeApiHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

export function isRetryableUpstreamStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

export function isRetryableFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.name === "AbortError" || err.name === "TimeoutError"
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type PortalApiJson = {
  success?: boolean
  data?: unknown
  error?: { code?: string; message?: string; requestId?: string }
}

export type PortalApiFetchResult = {
  ok: boolean
  status: number
  json: PortalApiJson | null
  errorCode?: string
  errorMessage?: string
  networkError?: boolean
}

export type PortalApiFetchOptions = {
  path: string
  method?: "GET" | "HEAD"
  cookie?: string | null
  origin: string
  proto: string
  host?: string | null
}

function buildRequestHeaders(options: PortalApiFetchOptions): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/json",
    origin: options.origin,
    "x-forwarded-proto": options.proto,
  }
  if (options.host) headers["x-forwarded-host"] = options.host
  if (options.cookie) headers.cookie = options.cookie
  return headers
}

/**
 * Server-side fetch to Nest via API_INTERNAL_URL (bypasses Next route handlers).
 */
export async function fetchPortalApi(
  options: PortalApiFetchOptions
): Promise<PortalApiFetchResult> {
  const method = options.method ?? "GET"
  const url = `${apiInternalUrl()}${options.path.startsWith("/") ? options.path : `/${options.path}`}`
  const headers = buildRequestHeaders(options)
  const apiHost = sanitizeApiHost(apiInternalUrl())
  const started = Date.now()

  for (let attempt = 0; attempt <= PORTAL_API_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(PORTAL_API_TIMEOUT_MS),
      })

      if (
        isRetryableUpstreamStatus(response.status) &&
        attempt < PORTAL_API_MAX_RETRIES
      ) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 500)
        continue
      }

      const json = (await response.json().catch(() => null)) as PortalApiJson | null
      if (!response.ok) {
        const parsed = json?.error
        const errorCode =
          parsed?.code ??
          (response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED")
        const errorMessage = describeHttpFailure({
          status: response.status,
          bodyMessage: parsed?.message,
          statusText: response.statusText,
          method,
          path: options.path,
          host: apiHost,
        })
        console.warn("[portal-api-fetch]", {
          path: options.path,
          status: response.status,
          code: errorCode,
          durationMs: Date.now() - started,
          apiHost,
        })
        return {
          ok: false,
          status: response.status,
          json,
          errorCode,
          errorMessage,
        }
      }

      return { ok: true, status: response.status, json }
    } catch (err) {
      if (isRetryableFetchError(err) && attempt < PORTAL_API_MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 500)
        continue
      }

      console.warn("[portal-api-fetch]", {
        path: options.path,
        status: 0,
        code: "API_UNAVAILABLE",
        durationMs: Date.now() - started,
        apiHost,
        error: err instanceof Error ? err.message : String(err),
      })
      return {
        ok: false,
        status: 502,
        json: null,
        errorCode: "API_UNAVAILABLE",
        errorMessage: `Cannot reach API at ${apiHost}`,
        networkError: true,
      }
    }
  }

  return {
    ok: false,
    status: 502,
    json: null,
    errorCode: "API_UNAVAILABLE",
    errorMessage: `Cannot reach API at ${apiHost}`,
    networkError: true,
  }
}

export async function fetchPortalApiHealth(
  options: Omit<PortalApiFetchOptions, "path">
): Promise<PortalApiFetchResult> {
  return fetchPortalApi({ ...options, path: "/api/v1/health" })
}
