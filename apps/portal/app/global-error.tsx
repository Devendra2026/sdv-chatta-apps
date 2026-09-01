"use client"

import { Button } from "@workspace/ui/components/button"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="shadow-soft max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-xl font-semibold text-slate-950">
              Portal unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              A critical error occurred. Please try again or contact support if
              the problem persists.
            </p>
            <Button className="mt-5" onClick={reset}>
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
