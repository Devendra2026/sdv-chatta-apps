import {
  describeCookieForwardingState,
  resolveCookieHeaderForProxy,
  resolveForwardedProto,
} from "@workspace/types"
import { NextRequest, NextResponse } from "next/server"

import { applyUpstreamSetCookies } from "@/lib/forward-set-cookies"
import {
  apiInternalUrl,
  isRetryableFetchError,
  isRetryableUpstreamStatus,
  PORTAL_API_MAX_RETRIES,
  PORTAL_API_TIMEOUT_MS,
  sanitizeApiHost,
  sleep,
  upstreamApiRequest,
  type PortalApiJson,
} from "@/lib/portal-api-fetch"

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
])

const SKIP_UPSTREAM_RESPONSE = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
])

const RETRY_BACKOFF_MS = [200, 500]

function shouldLogMissingCookie(apiPath: string): boolean {
  if (!apiPath.startsWith("/api/v1/")) return false
  if (apiPath.startsWith("/api/v1/health")) return false
  if (apiPath.startsWith("/api/v1/auth/forgot-password")) return false
  if (apiPath.startsWith("/api/v1/auth/login")) return false
  if (apiPath.startsWith("/api/v1/auth/logout")) return false
  return true
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

function apiUnavailableResponse(apiHost: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "API_UNAVAILABLE",
        message: `Cannot reach API at ${apiHost}`,
      },
    },
    { status: 502, headers: { "cache-control": "private, no-store" } }
  )
}

function upstreamErrorResponse(status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UPSTREAM_ERROR",
        message,
        upstreamStatus: status,
      },
    },
    { status, headers: { "cache-control": "private, no-store" } }
  )
}

async function readUpstreamErrorMessage(response: Response): Promise<string> {
  const json = (await response.json().catch(() => null)) as PortalApiJson | null
  if (json?.error?.message) return json.error.message
  return response.statusText || "Upstream request failed"
}

/**
 * Forward a portal request to Nest, including session cookies.
 *
 * Next.js rewrites to `http://api:4000` can drop `__Secure-` cookies.
 * Filesystem routes (`/api/auth`, `/api/v1`) must proxy instead.
 */
export async function proxyToApi(
  req: NextRequest,
  apiPath: string
): Promise<NextResponse> {
  const target = new URL(apiPath, apiInternalUrl())
  const apiHost = sanitizeApiHost(apiInternalUrl())
  const started = Date.now()

  // Snapshot Cookie before any next/headers cookies() call. cookies() can
  // consume/filter the incoming header (especially `__Secure-` names when
  // the portal container sees HTTP behind Traefik).
  const rawCookieHeader = req.headers.get("cookie")
  const requestCookiePairs = req.cookies.getAll()
  const cookieHeader =
    resolveCookieHeaderForProxy(rawCookieHeader, requestCookiePairs) ??
    (rawCookieHeader?.trim() || null)
  const cookieState = describeCookieForwardingState({
    rawHeader: rawCookieHeader,
    forwardedHeader: cookieHeader,
    sessionCookieName: process.env.SESSION_COOKIE_NAME,
  })

  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  headers.delete("accept-encoding")

  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin
  headers.set("origin", origin)
  headers.set("x-forwarded-host", req.headers.get("host") ?? "")
  const proto = resolveForwardedProto({
    forwardedProtoHeader: req.headers.get("x-forwarded-proto"),
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    originHeader: req.headers.get("origin"),
    requestProtocol: req.nextUrl.protocol,
  })
  headers.set("x-forwarded-proto", proto)

  if (cookieHeader) {
    headers.set("cookie", cookieHeader)
  } else if (rawCookieHeader?.trim()) {
    headers.set("cookie", rawCookieHeader)
  } else {
    headers.delete("cookie")
    if (shouldLogMissingCookie(apiPath)) {
      console.warn("[proxy-to-api] cookie header missing", {
        path: apiPath,
        forwardedProto: proto,
        ...cookieState,
      })
    }
  }

  if (
    cookieHeader &&
    !cookieState.hasSessionCookie &&
    shouldLogMissingCookie(apiPath)
  ) {
    console.warn("[proxy-to-api] Cookie present but no session token", {
      path: apiPath,
      forwardedProto: proto,
      ...cookieState,
    })
  }

  const method = req.method.toUpperCase()
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer()
  const canRetry = method === "GET" || method === "HEAD"

  let upstream: Response | null = null

  for (let attempt = 0; attempt <= PORTAL_API_MAX_RETRIES; attempt++) {
    try {
      // node:http via resolved IP — never Next-patched fetch(target).
      // Plain record so Cookie is not dropped as a forbidden header name.
      const response = await upstreamApiRequest(target.toString(), {
        method,
        headers: headersToRecord(headers),
        body:
          body === undefined ? undefined : Buffer.from(new Uint8Array(body)),
        signal: AbortSignal.timeout(PORTAL_API_TIMEOUT_MS),
      })

      if (
        canRetry &&
        isRetryableUpstreamStatus(response.status) &&
        attempt < PORTAL_API_MAX_RETRIES
      ) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 500)
        continue
      }

      if (
        !canRetry &&
        isRetryableUpstreamStatus(response.status) &&
        response.status >= 500
      ) {
        const message = await readUpstreamErrorMessage(response)
        console.warn("[proxy-to-api]", {
          path: apiPath,
          status: response.status,
          durationMs: Date.now() - started,
          apiHost,
        })
        return upstreamErrorResponse(response.status, message)
      }

      upstream = response
      break
    } catch (err) {
      if (
        canRetry &&
        isRetryableFetchError(err) &&
        attempt < PORTAL_API_MAX_RETRIES
      ) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 500)
        continue
      }

      console.warn("[proxy-to-api]", {
        path: apiPath,
        status: 0,
        durationMs: Date.now() - started,
        apiHost,
        error: err instanceof Error ? err.message : String(err),
      })
      return apiUnavailableResponse(apiHost)
    }
  }

  if (!upstream) {
    return apiUnavailableResponse(apiHost)
  }

  if (upstream.status === 401 || upstream.status === 403) {
    console.warn("[proxy-to-api] upstream unauthorized", {
      path: apiPath,
      status: upstream.status,
      durationMs: Date.now() - started,
      apiHost,
      forwardedProto: proto,
      ...cookieState,
    })
  }

  if (upstream.status >= 500) {
    const message = await readUpstreamErrorMessage(upstream)
    console.warn("[proxy-to-api]", {
      path: apiPath,
      status: upstream.status,
      durationMs: Date.now() - started,
      apiHost,
    })
    return upstreamErrorResponse(upstream.status, message)
  }

  const resHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (SKIP_UPSTREAM_RESPONSE.has(key.toLowerCase())) return
    if (key.toLowerCase() === "set-cookie") return
    resHeaders.append(key, value)
  })
  if (!resHeaders.has("cache-control")) {
    resHeaders.set("cache-control", "private, no-store")
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
  applyUpstreamSetCookies(
    res,
    upstream.headers.getSetCookie(),
    proto === "https"
  )
  return res
}

export { apiInternalUrl } from "@/lib/portal-api-fetch"
