import http from "node:http"
import type { AddressInfo } from "node:net"
import type { INestApplication } from "@nestjs/common"

export type CriticalRouteProbe = {
  method: "GET" | "POST"
  path: string
  /** Status codes that prove the route is registered (must not include 404). */
  allowedStatuses: number[]
}

export const CRITICAL_API_ROUTES: CriticalRouteProbe[] = [
  { method: "GET", path: "/api/v1/health", allowedStatuses: [200] },
  { method: "GET", path: "/api/v1/health/live", allowedStatuses: [200] },
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

function requestListener(app: INestApplication): http.RequestListener {
  const instance: unknown = app.getHttpAdapter().getInstance()
  if (typeof instance !== "function") {
    throw new Error("Critical route probe requires an HTTP request listener")
  }
  return instance as http.RequestListener
}

function listenEphemeral(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error)
    server.once("error", onError)
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError)
      resolve()
    })
  })
}

function boundPort(server: http.Server): number {
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Critical route probe failed to bind")
  }
  return (address as AddressInfo).port
}

async function closeServer(server: http.Server): Promise<void> {
  if (!server.listening) return
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function probeStatus(
  baseUrl: string,
  probe: CriticalRouteProbe
): Promise<number> {
  const response = await fetch(`${baseUrl}${probe.path}`, {
    method: probe.method,
    headers: {
      connection: "close",
      ...(probe.method === "POST"
        ? { "content-type": "application/json" }
        : {}),
    },
    body: probe.method === "POST" ? "{}" : undefined,
  })
  await response.arrayBuffer()
  return response.status
}

/**
 * Confirms critical routes are registered on the initialized Nest app.
 * Uses a short-lived server so the process does not depend on supertest,
 * which is not installed in the production image. Nest's own server is
 * left unbound for the later app.listen() call.
 */
export async function verifyCriticalRoutes(
  app: INestApplication
): Promise<CriticalRouteVerification[]> {
  const server = http.createServer(requestListener(app))
  try {
    await listenEphemeral(server)
    const baseUrl = `http://127.0.0.1:${boundPort(server)}`
    const results: CriticalRouteVerification[] = []

    for (const probe of CRITICAL_API_ROUTES) {
      const status = await probeStatus(baseUrl, probe)
      const route = `${probe.method} ${probe.path}`
      const ok = status !== 404 && probe.allowedStatuses.includes(status)
      results.push({ route, status, ok })
      if (!ok) {
        throw new Error(
          `Critical route verification failed for ${route}: status=${status} (allowed: ${probe.allowedStatuses.join(", ")}, 404 means route missing)`
        )
      }
    }

    return results
  } finally {
    await closeServer(server)
  }
}
