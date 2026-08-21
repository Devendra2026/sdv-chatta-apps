import { Suspense } from "react"

import SurveysClientPage from "./surveys-client"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-18 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </div>
      }
    >
      <SurveysClientPage />
    </Suspense>
  )
}
