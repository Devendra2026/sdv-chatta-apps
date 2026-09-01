import { ApiError, createApiClient } from "@workspace/api-client"

/**
 * Same-origin only. Session cookies are first-party on the portal host
 * (localhost / portal.npchhata.com) and forwarded by proxyToApi.
 * Do not point this at Nest — that would drop cookies on cross-origin fetches.
 */
export const api = createApiClient({
  baseUrl: "",
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
