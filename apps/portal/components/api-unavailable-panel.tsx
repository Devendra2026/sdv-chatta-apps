"use client"

import { Button } from "@workspace/ui/components/button"

import { usePermission } from "@/hooks/use-permission"
import { formatApiError } from "@/lib/format-api-error"
import type { SessionError } from "@/lib/server-session"

export function ApiUnavailablePanel({
  error,
  onRetry,
}: {
  error?: SessionError | null
  onRetry?: () => void
}) {
  const { refetch } = usePermission()

  function handleRetry() {
    if (onRetry) {
      onRetry()
      return
    }
    refetch()
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg font-medium">Service temporarily unavailable</p>
      <p
        className="max-w-md text-sm text-muted-foreground"
        role="alert"
      >
        {formatApiError(
          error,
          "Could not reach the API. Try again in a moment."
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        onClick={handleRetry}
      >
        Retry
      </Button>
    </div>
  )
}
