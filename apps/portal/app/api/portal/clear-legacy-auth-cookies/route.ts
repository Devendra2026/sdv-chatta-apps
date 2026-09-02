import { expiredLegacyAuthCookieHeaders } from "@workspace/types"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Expire leftover Better Auth cookies without calling Nest.
 * Used on the login page so stale __Secure-better-auth.* tokens are cleared.
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true })
  const existing = req.cookies.getAll().map((c) => c.name)
  for (const header of expiredLegacyAuthCookieHeaders(existing)) {
    res.headers.append("set-cookie", header)
  }
  return res
}
