import { ApiError, createApiClient } from "@workspace/api-client"

function readBrowserCsrf(): string | null {
  if (typeof document === "undefined") return null
  const prefix = "csrf_token="
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    const value = trimmed.slice(prefix.length)
    if (value.trim()) return decodeURIComponent(value.trim())
  }
  return null
}

let csrfBootstrap: Promise<string | null> | null = null

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readBrowserCsrf()
  if (existing) return existing
  if (!csrfBootstrap) {
    csrfBootstrap = fetch("/api/v1/csrf", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((json: { data?: { token?: string } }) => {
        return json.data?.token ?? readBrowserCsrf()
      })
      .catch(() => null)
  }
  return csrfBootstrap
}

/**
 * Same-origin only. Session cookies are first-party on the portal host
 * (localhost / portal.npchhata.com) and forwarded by proxyToApi.
 * Do not point this at Nest — that would drop cookies on cross-origin fetches.
 */
export const api = createApiClient({
  baseUrl: "",
  getHeaders: async (): Promise<Record<string, string>> => {
    const token = await ensureCsrfToken()
    return token ? { "X-CSRF-Token": token } : {}
  },
})

export { ApiError }

export type MeUser = {
  id: string
  email: string
  name: string
  phone?: string | null
  status: string
  permissions: string[]
  roles: string[]
}

export type AuthSessionItem = {
  id: string
  createdAt: string
  lastActiveAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  current: boolean
}
