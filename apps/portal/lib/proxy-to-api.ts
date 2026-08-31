import {
  resolveCookieHeaderForProxy,
  resolveForwardedProto,
} from "@workspace/types"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { applyUpstreamSetCookies } from "@/lib/forward-set-cookies"

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

export function apiInternalUrl() {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  )
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

  const jar = await cookies()
  const cookieHeader = resolveCookieHeaderForProxy(
    req.headers.get("cookie"),
    jar.getAll()
  )
  if (cookieHeader) {
    headers.set("cookie", cookieHeader)
  } else {
    headers.delete("cookie")
  }

  const method = req.method.toUpperCase()
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer()

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_UNAVAILABLE",
          message: "API is unavailable",
        },
      },
      { status: 502, headers: { "cache-control": "private, no-store" } }
    )
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
