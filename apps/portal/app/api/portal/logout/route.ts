import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "better-auth.dont_remember",
  "better-auth.account_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
]

function clearAuthCookies(res: NextResponse, req: NextRequest) {
  const names = new Set(AUTH_COOKIE_NAMES)
  for (const c of req.cookies.getAll()) {
    if (
      c.name.includes("better-auth") ||
      c.name.includes("session_token") ||
      c.name.includes("session_data")
    ) {
      names.add(c.name)
    }
  }
  for (const name of names) {
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    })
    // Also clear non-httpOnly variants browsers may keep
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
    })
  }
}

/**
 * Portal-owned logout: call Nest Better Auth sign-out, then always clear
 * first-party cookies on the portal response (rewrites alone can drop Set-Cookie).
 */
export async function POST(req: NextRequest) {
  const apiInternal =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin ??
    "http://localhost:3000"

  try {
    await fetch(`${apiInternal}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        origin,
        referer: origin,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: "{}",
    })
  } catch {
    // Still clear local cookies even if API is down
  }

  const res = NextResponse.json({ success: true })
  clearAuthCookies(res, req)
  return res
}
