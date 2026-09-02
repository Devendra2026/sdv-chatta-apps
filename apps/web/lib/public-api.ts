import {
  ApiError,
  createPublicApiClient,
} from "@workspace/api-client"

function resolvePublicApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return ""
  }
  const internal = process.env.API_INTERNAL_URL?.trim()
  if (internal) return internal.replace(/\/$/, "")
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  return "http://localhost:4000"
}

const publicClient = createPublicApiClient({
  resolveBaseUrl: resolvePublicApiBaseUrl,
})

export { ApiError as PublicApiError }

export async function publicApiGet<T>(path: string): Promise<T> {
  const { data } = await publicClient.get<T>(path)
  return data
}

export async function publicApiPost<T>(path: string, body: unknown): Promise<T> {
  const { data } = await publicClient.post<T>(path, body)
  return data
}
