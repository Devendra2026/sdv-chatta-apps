"use client"

import { api } from "@/lib/api"

/** Sign out via Nest and redirect to login. */
export async function signOutAndRedirect() {
  try {
    await api.post("/api/v1/auth/logout", {})
  } catch {
    // Still leave the app even if API is down.
  }
  window.location.assign("/login?signedOut=1")
}
