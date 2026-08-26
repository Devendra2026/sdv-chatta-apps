import { Skeleton } from "@workspace/ui/components/skeleton"

export function SettingsTableLoading({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-full max-w-sm" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

export function SettingsMatrixLoading() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-[260px_1fr]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2 rounded-xl border p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
