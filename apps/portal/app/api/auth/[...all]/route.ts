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

function apiInternalUrl() {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  )
}

async function proxyAuth(
  req: NextRequest,
  all: string[]
): Promise<NextResponse> {
  const path = all.join("/")
  const target = new URL(
    `/api/auth/${path}${req.nextUrl.search}`,
    apiInternalUrl()
  )

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

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  })

  const resHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (SKIP_UPSTREAM_RESPONSE.has(key.toLowerCase())) return
    if (key.toLowerCase() === "set-cookie") return
    resHeaders.append(key, value)
  })
  for (const cookie of upstream.headers.getSetCookie()) {
    resHeaders.append("set-cookie", cookie)
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ all: string[] }> }
) {
  const { all } = await ctx.params
  return proxyAuth(req, all)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
