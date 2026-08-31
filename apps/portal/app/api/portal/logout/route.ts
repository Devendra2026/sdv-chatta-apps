import { expiredAuthCookieHeaders } from "@workspace/types"
import { NextRequest, NextResponse } from "next/server"

import { proxyToApi } from "@/lib/proxy-to-api"

export const dynamic = "force-dynamic"

function appendExpiredAuthCookies(res: NextResponse, req: NextRequest) {
  const existing = req.cookies.getAll().map((c) => c.name)
  for (const header of expiredAuthCookieHeaders(existing)) {
    res.headers.append("set-cookie", header)
  }
}

/**
 * Portal-owned logout: sign out through the same Nest proxy as login (so
 * x-forwarded-proto / Origin match HTTPS cookies), forward Better Auth
 * Set-Cookie, then expire leftover secure and non-secure session cookies.
 */
export async function POST(req: NextRequest) {
  let upstreamCookies: string[] = []
  try {
    const proxied = await proxyToApi(req, "/api/auth/sign-out")
    upstreamCookies = proxied.headers.getSetCookie()
  } catch {
    // Still clear local cookies even if API is down
  }

  const res = NextResponse.json({ success: true })
  for (const cookie of upstreamCookies) {
    res.headers.append("set-cookie", cookie)
  }
  appendExpiredAuthCookies(res, req)
  return res
}
