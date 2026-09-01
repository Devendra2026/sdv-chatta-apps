"use client"

import { Button } from "@workspace/ui/components/button"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="shadow-soft max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-950">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This page could not be loaded. Try again or return to the dashboard.
        </p>
        <Button className="mt-5" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  )
}
