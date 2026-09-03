import {
  describeCookieForwardingState,
  describeHttpFailure,
} from "@workspace/types"
import dns from "node:dns/promises"
import http, { type IncomingMessage } from "node:http"
import https from "node:https"
import { isIP } from "node:net"

const RETRY_BACKOFF_MS = [200, 500]

/** Strip pathname so `base + /api/v1/...` cannot double-prefix. */
export function normalizeApiInternalOrigin(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return "http://localhost:4000"
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed.replace(/\/+$/, "")
  }
}

export function apiInternalUrl() {
  const raw =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  return normalizeApiInternalOrigin(raw)
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

/** Loopback / RFC1918 / ULA only — never a public A record for hostname `api`. */
export function isAllowedApiConnectAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const parts = address.split(".").map((part) => Number(part))
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) {
      return false
    }
    const a = parts[0]
    const b = parts[1]
    if (a === 10 || a === 127) return true
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }
  if (version === 6) {
    const normalized = address.toLowerCase()
    if (normalized === "::1") return true
    if (normalized.startsWith("fe80:")) return true
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)
    if (mapped?.[1]) return isAllowedApiConnectAddress(mapped[1])
    return false
  }
  return false
}

/**
 * Resolve Nest's connect IP. Docker Desktop forwards unknown names to the
 * host resolver, which applies a search domain (`api` → `api.iballbatonwifi.com`)
 * and returns public A records. Those hosts are not Nest.
 */
export async function resolveAllowedConnectHost(hostname: string): Promise<{
  connectHost: string
  dnsAddresses: string[]
}> {
  if (isIP(hostname)) {
    if (!isAllowedApiConnectAddress(hostname)) {
      throw new Error(`Refusing public API address ${hostname}`)
    }
    return { connectHost: hostname, dnsAddresses: [hostname] }
  }

  const dnsAddresses: string[] = []

  try {
    const resolver = new dns.Resolver()
    resolver.setServers(["127.0.0.11"])
    const v4 = await resolver.resolve4(hostname).catch(() => [])
    dnsAddresses.push(...v4)
    if (!v4.some(isAllowedApiConnectAddress)) {
      const v6 = await resolver.resolve6(hostname).catch(() => [])
      dnsAddresses.push(...v6)
    }
  } catch {
    /* 127.0.0.11 is Docker-only; host `next dev` falls through. */
  }

  if (!dnsAddresses.some(isAllowedApiConnectAddress)) {
    const lookedUp = await dns.lookup(hostname, { all: true }).catch(() => [])
    for (const entry of lookedUp) {
      if (!dnsAddresses.includes(entry.address)) {
        dnsAddresses.push(entry.address)
      }
    }
  }

  const connectHost = dnsAddresses.find(isAllowedApiConnectAddress)
  if (!connectHost) {
    // #region agent log
    fetch("http://127.0.0.1:7787/ingest/931237b4-c66c-490a-b4d4-33ab324d8e01", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "8f00f0",
      },
      body: JSON.stringify({
        sessionId: "8f00f0",
        runId: "post-fix",
        hypothesisId: "H2",
        location: "portal-api-fetch.ts:resolveAllowedConnectHost",
        message: "rejected public DNS for API hostname",
        data: { hostname, dnsAddresses },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    console.warn("[upstream-api-request] refused public DNS", {
      hostname,
      dnsAddresses,
    })
    throw new Error(
      `No private DNS address for ${hostname} (got ${dnsAddresses.join(", ") || "none"})`
    )
  }
  return { connectHost, dnsAddresses }
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

function incomingToHeaders(res: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(res.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }
  return headers
}

/**
 * TCP request to Nest. Must not use global fetch — Next.js 16 patches
 * fetch and can treat `http://api:4000/api/...` as an internal portal
 * request when that URL matches a local /api route or old rewrite
 * destination, returning a 404 with no `x-api-build-id` / `x-api-pid`.
 *
 * Connect by a private/loopback IP only. Short name `api` can resolve
 * through the host search domain to public hosts (404, no Nest headers).
 * Set Host explicitly. Disable keep-alive so a bad peer is not reused.
 */
export async function upstreamApiRequest(
  url: string,
  init: {
    method: string
    headers: Record<string, string>
    body?: Buffer | Uint8Array | ArrayBuffer | null
    signal?: AbortSignal
    debugSource?: string
  }
): Promise<Response> {
  const parsed = new URL(url)
  const lib = parsed.protocol === "https:" ? https : http
  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80")
  const hostname = parsed.hostname

  const { connectHost, dnsAddresses } =
    await resolveAllowedConnectHost(hostname)

  const requestHeaders: Record<string, string> = { ...init.headers }
  if (!Object.keys(requestHeaders).some((k) => k.toLowerCase() === "host")) {
    requestHeaders.host =
      port === "80" || port === "443" ? hostname : `${hostname}:${port}`
  }

  const bodyBuffer =
    init.body == null
      ? undefined
      : Buffer.isBuffer(init.body)
        ? init.body
        : Buffer.from(
            init.body instanceof ArrayBuffer
              ? new Uint8Array(init.body)
              : init.body
          )
  if (bodyBuffer && bodyBuffer.byteLength > 0) {
    if (
      !Object.keys(requestHeaders).some(
        (k) => k.toLowerCase() === "content-length"
      )
    ) {
      requestHeaders["content-length"] = String(bodyBuffer.byteLength)
    }
  }

  return new Promise((resolve, reject) => {
    if (init.signal?.aborted) {
      const abortErr = new Error("The operation was aborted")
      abortErr.name = "AbortError"
      reject(abortErr)
      return
    }

    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: connectHost,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method: init.method,
        headers: requestHeaders,
        servername: parsed.protocol === "https:" ? hostname : undefined,
        agent: false,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => {
          init.signal?.removeEventListener("abort", onAbort)
          const rawBody = Buffer.concat(chunks)
          const headerNames = Object.keys(res.headers)
          const remoteAddress = res.socket?.remoteAddress
          let bodyCode: string | undefined
          let bodyPreview = ""
          try {
            bodyPreview = rawBody.subarray(0, 180).toString("utf8")
            const parsedBody = JSON.parse(rawBody.toString("utf8")) as {
              error?: { code?: string }
            }
            bodyCode = parsedBody.error?.code
          } catch {
            /* non-JSON upstream body */
          }
          // #region agent log
          fetch(
            "http://127.0.0.1:7787/ingest/931237b4-c66c-490a-b4d4-33ab324d8e01",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "8f00f0",
              },
              body: JSON.stringify({
                sessionId: "8f00f0",
                runId: "post-fix",
                hypothesisId: "H2",
                location: "portal-api-fetch.ts:upstreamApiRequest",
                message: "upstream TCP response",
                data: {
                  source: init.debugSource ?? "unknown",
                  method: init.method,
                  path: `${parsed.pathname}${parsed.search}`,
                  hostname,
                  connectHost,
                  dnsAddresses,
                  remoteAddress,
                  status: res.statusCode ?? 502,
                  headerNames,
                  hasApiBuildId: Boolean(res.headers["x-api-build-id"]),
                  hasApiPid: Boolean(res.headers["x-api-pid"]),
                  contentType: res.headers["content-type"],
                  bodyCode,
                  bodyPreview,
                },
                timestamp: Date.now(),
              }),
            }
          ).catch(() => {})
          // #endregion
          console.warn("[upstream-api-request]", {
            source: init.debugSource ?? "unknown",
            path: `${parsed.pathname}${parsed.search}`,
            status: res.statusCode ?? 502,
            connectHost,
            dnsAddresses,
            remoteAddress,
            hasApiBuildId: Boolean(res.headers["x-api-build-id"]),
            hasApiPid: Boolean(res.headers["x-api-pid"]),
            bodyCode,
          })
          resolve(
            new Response(rawBody, {
              status: res.statusCode ?? 502,
              statusText: res.statusMessage,
              headers: incomingToHeaders(res),
            })
          )
        })
      }
    )

    const onAbort = () => {
      req.destroy()
      const abortErr = new Error("The operation was aborted")
      abortErr.name = "AbortError"
      reject(abortErr)
    }

    init.signal?.addEventListener("abort", onAbort, { once: true })
    req.on("error", (err) => {
      init.signal?.removeEventListener("abort", onAbort)
      reject(err)
    })
    if (bodyBuffer && bodyBuffer.byteLength > 0) {
      req.end(bodyBuffer)
    } else {
      req.end()
    }
  })
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
  /** For diagnostics only — never log cookie values. */
  sessionCookieName?: string | null
}

function buildRequestHeaders(
  options: PortalApiFetchOptions
): Record<string, string> {
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
      const response = await upstreamApiRequest(url, {
        method,
        headers,
        signal: AbortSignal.timeout(PORTAL_API_TIMEOUT_MS),
        debugSource: "portal-api-fetch",
      })

      if (
        isRetryableUpstreamStatus(response.status) &&
        attempt < PORTAL_API_MAX_RETRIES
      ) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 500)
        continue
      }

      const json = (await response
        .json()
        .catch(() => null)) as PortalApiJson | null
      const requestId =
        response.headers.get("x-request-id") ??
        json?.error?.requestId ??
        undefined
      const apiBuildId = response.headers.get("x-api-build-id") ?? undefined
      const apiPid = response.headers.get("x-api-pid") ?? undefined
      const cookieState = describeCookieForwardingState({
        rawHeader: options.cookie ?? null,
        forwardedHeader: options.cookie ?? null,
        sessionCookieName: options.sessionCookieName,
      })

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
          url,
          status: response.status,
          code: errorCode,
          durationMs: Date.now() - started,
          apiHost,
          apiBuildId,
          apiPid,
          requestId,
          hasCookie: Boolean(options.cookie?.trim()),
          hasSessionCookie: cookieState.hasSessionCookie,
          forwardedCookieNames: cookieState.forwardedCookieNames,
          authHint:
            response.status === 401
              ? "route_exists_session_rejected"
              : response.status === 404
                ? "route_missing_or_wrong_backend"
                : undefined,
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
