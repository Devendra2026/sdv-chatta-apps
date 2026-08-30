import { NextRequest, NextResponse } from "next/server"

const publicPaths = ["/login", "/signup", "/forgot-password"] // /signup redirects to /login (no self-registration)

function hasAuthSessionCookie(req: NextRequest) {
  return req.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("better-auth.session_token") ||
        c.name.includes("session_token")
    )
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Auth + API must never be redirected — login posts to /api/auth/* via rewrite.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

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
      pathname === "/forgot-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run on app pages only. Still include /api in matcher so we can
     * explicitly pass them through above (avoids accidental future gating).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
