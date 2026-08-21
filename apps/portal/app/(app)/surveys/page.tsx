import { Suspense } from "react"

import SurveysClientPage from "./surveys-client"

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground text-sm">Loading surveys…</p>}
    >
      <SurveysClientPage />
    </Suspense>
  )
}
