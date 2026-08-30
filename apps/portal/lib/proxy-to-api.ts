import { NextRequest, NextResponse } from "next/server"

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
 * Forward a portal request to Nest, including the raw Cookie header.
 *
 * Next.js rewrites to `http://api:4000` can drop `__Secure-` session cookies
 * (production HTTPS). Login still works because `/api/auth` already uses this
 * proxy; `/api/v1/*` (including `/auth/me`) must do the same.
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
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin
  headers.set("origin", origin)
  headers.set("x-forwarded-host", req.headers.get("host") ?? "")
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""))

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
  for (const cookie of upstream.headers.getSetCookie()) {
    resHeaders.append("set-cookie", cookie)
  }
  if (!resHeaders.has("cache-control")) {
    resHeaders.set("cache-control", "private, no-store")
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}
