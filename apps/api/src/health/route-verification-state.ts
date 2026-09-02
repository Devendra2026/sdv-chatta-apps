import type { CriticalRouteVerification } from "./verify-critical-routes"

let routesVerifiedAt: string | null = null
let verifiedRoutes: CriticalRouteVerification[] = []

export function markRoutesVerified(
  results: CriticalRouteVerification[]
): void {
  routesVerifiedAt = new Date().toISOString()
  verifiedRoutes = results
}

export function getRoutesVerifiedState(): {
  routesVerifiedAt: string | null
  verifiedRoutes: CriticalRouteVerification[]
} {
  return { routesVerifiedAt, verifiedRoutes }
}

export function resetRoutesVerifiedStateForTests(): void {
  routesVerifiedAt = null
  verifiedRoutes = []
}
