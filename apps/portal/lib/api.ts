import { ApiError, createApiClient } from "@workspace/api-client"

/**
 * Empty baseUrl = same-origin requests (portal rewrites /api → Nest).
 * Override with NEXT_PUBLIC_API_URL only when the API is on a separate public host
 * without a reverse proxy.
 */
export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL?.trim()
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "",
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
