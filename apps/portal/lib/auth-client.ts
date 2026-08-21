"use client"

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
})

/** Reliable logout: portal route clears httpOnly cookies, then hard-navigate. */
export async function signOutAndRedirect() {
  try {
    await fetch("/api/portal/logout", {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json" },
    })
  } catch {
    try {
      await authClient.signOut()
    } catch {
      // ignore — still leave the app
    }
  }
  window.location.assign("/login?signedOut=1")
}
