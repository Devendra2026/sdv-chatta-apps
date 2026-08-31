"use client"

import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/**
 * Always use the current browser origin so auth cookies stay first-party.
 * Nest is reached via Next rewrite (/api/*) or API_INTERNAL_URL on the server.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  plugins: [emailOTPClient()],
})

/** Reliable logout: Better Auth sign-out, then expire leftover cookies. */
export async function signOutAndRedirect() {
  try {
    await authClient.signOut({
      fetchOptions: { credentials: "include" },
    })
  } catch {
    // continue — portal route still expires cookies
  }
  try {
    await fetch("/api/portal/logout", {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json" },
    })
  } catch {
    // ignore — still leave the app
  }
  window.location.assign("/login?signedOut=1")
}
