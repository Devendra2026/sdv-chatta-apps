import { knownSessionCookieNames } from "@workspace/types"
import { NextRequest, NextResponse } from "next/server"

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password"]

function hasAuthSessionCookie(req: NextRequest) {
  const names = new Set(knownSessionCookieNames(process.env.SESSION_COOKIE_NAME))
  for (const name of names) {
    const token = req.cookies.get(name)?.value
    if (token?.trim()) return true
  }
  return false
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const signedOut = req.nextUrl.searchParams.get("signedOut") === "1"
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  const hasSession = !signedOut && hasAuthSessionCookie(req)

  if (!isPublic && !hasSession && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (
    isPublic &&
    hasSession &&
    (pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Pages only. Never run on /api/* — cloning request headers in the
     * Next.js proxy strips Cookie from Route Handlers, so Nest never
     * sees the session after login.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)",
  ],
}
