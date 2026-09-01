import { formatIntegrationError } from "@workspace/types"

import { ApiError } from "@/lib/api"
import type { SessionError } from "@/lib/server-session"

export function formatApiError(
  error: unknown,
  fallback = "Request failed"
): string {
  if (error instanceof ApiError) {
    return formatIntegrationError({
      code: error.code,
      message: error.message,
      status: error.status,
      path: error.path,
    }, fallback)
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    "status" in error
  ) {
    return formatIntegrationError(error as SessionError, fallback)
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
