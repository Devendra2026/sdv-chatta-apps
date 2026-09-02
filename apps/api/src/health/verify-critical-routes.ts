import type { INestApplication } from "@nestjs/common"
import request from "supertest"

export type CriticalRouteProbe = {
  method: "GET" | "POST"
  path: string
  /** Status codes that prove the route is registered (must not include 404). */
  allowedStatuses: number[]
}

export const CRITICAL_API_ROUTES: CriticalRouteProbe[] = [
  { method: "GET", path: "/api/v1/health", allowedStatuses: [200] },
  { method: "GET", path: "/api/v1/csrf", allowedStatuses: [200] },
  {
    method: "GET",
    path: "/api/v1/auth/me",
    allowedStatuses: [401],
  },
]

export type CriticalRouteVerification = {
  route: string
  status: number
  ok: boolean
}

export async function verifyCriticalRoutes(
  app: INestApplication
): Promise<CriticalRouteVerification[]> {
  const server = app.getHttpServer()
  const results: CriticalRouteVerification[] = []

  for (const probe of CRITICAL_API_ROUTES) {
    const agent = request(server)
    const res =
      probe.method === "GET"
        ? await agent.get(probe.path)
        : await agent.post(probe.path).send({})

    const route = `${probe.method} ${probe.path}`
    const ok =
      res.status !== 404 && probe.allowedStatuses.includes(res.status)

    results.push({ route, status: res.status, ok })
    if (!ok) {
      throw new Error(
        `Critical route verification failed for ${route}: status=${res.status} (allowed: ${probe.allowedStatuses.join(", ")}, 404 means route missing)`
      )
    }
  }

  return results
}
