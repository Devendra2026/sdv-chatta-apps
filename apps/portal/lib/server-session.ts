import {
  describeCookieForwardingState,
  resolveCookieHeaderForProxy,
  resolveForwardedProto,
} from "@workspace/types"
import { cookies, headers } from "next/headers"

import { type MeUser } from "@/lib/api"
import { fetchPortalApi, fetchPortalApiHealth } from "@/lib/portal-api-fetch"

export type SessionError = {
  code: string
  message: string
  status: number
  path?: string
}

export type CurrentUserResult =
  | { status: "ok"; user: MeUser }
  | { status: "unauthenticated" }
  | { status: "unavailable"; error?: SessionError }

export async function fetchCurrentUser(): Promise<CurrentUserResult> {
  const requestHeaders = await headers()
  const rawCookie = requestHeaders.get("cookie")
  const jar = await cookies()
  const cookie = resolveCookieHeaderForProxy(rawCookie, jar.getAll())
  if (!cookie) {
    console.warn("[server-session] cookie header missing", {
      path: "/api/v1/auth/me",
      ...describeCookieForwardingState({
        rawHeader: rawCookie,
        forwardedHeader: cookie,
        sessionCookieName: process.env.SESSION_COOKIE_NAME,
      }),
    })
    return { status: "unauthenticated" }
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    requestHeaders.get("origin") ??
    "http://localhost:3000"
  const proto = resolveForwardedProto({
    forwardedProtoHeader: requestHeaders.get("x-forwarded-proto"),
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    originHeader: requestHeaders.get("origin"),
    requestProtocol: origin.startsWith("https") ? "https:" : "http:",
  })
  const host = requestHeaders.get("host") ?? ""

  const fetchOptions = {
    cookie,
    origin,
    proto,
    host,
    sessionCookieName: process.env.SESSION_COOKIE_NAME,
  }

  // Nest AuthController GET /api/v1/auth/me — session user plus RBAC.
  const meResult = await fetchPortalApi({
    ...fetchOptions,
    path: "/api/v1/auth/me",
  })

  if (meResult.status === 401 || meResult.status === 403) {
    return { status: "unauthenticated" }
  }

  if (!meResult.ok) {
    let error: SessionError = {
      code: meResult.errorCode ?? "REQUEST_FAILED",
      message: meResult.errorMessage ?? "Could not load session",
      status: meResult.status,
      path: "/api/v1/auth/me",
    }

    if (
      meResult.networkError ||
      meResult.status === 502 ||
      meResult.status === 503 ||
      meResult.status === 504
    ) {
      const health = await fetchPortalApiHealth(fetchOptions)
      if (!health.ok) {
        error = {
          code: health.errorCode ?? "API_UNAVAILABLE",
          message: health.errorMessage ?? error.message,
          status: health.status,
          path: "/api/v1/health",
        }
      }
    }

    return { status: "unavailable", error }
  }

  const data = meResult.json?.data as MeUser | undefined
  if (!meResult.json?.success || !data?.id) {
    return {
      status: "unavailable",
      error: {
        code: "INVALID_SESSION_RESPONSE",
        message: "Session response was invalid",
        status: meResult.status,
        path: "/api/v1/auth/me",
      },
    }
  }

  return { status: "ok", user: data }
}
