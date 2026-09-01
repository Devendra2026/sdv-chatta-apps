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
 * Portal logout: Nest sign-out via BFF, forward Set-Cookie, expire legacy cookies.
 */
export async function POST(req: NextRequest) {
  let upstreamCookies: string[] = []
  try {
    const proxied = await proxyToApi(req, "/api/v1/auth/logout")
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
