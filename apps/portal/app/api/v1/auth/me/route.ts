import { NextRequest } from "next/server"

import { proxyToApi } from "@/lib/proxy-to-api"

export const dynamic = "force-dynamic"

/**
 * Static filesystem route so GET /api/v1/auth/me is not stolen by afterFiles
 * rewrites or skipped by the dynamic [...path] catch-all. Nest AuthMeController
 * (RBAC user + permissions) is the upstream — not Better Auth get-session.
 */
async function handle(req: NextRequest) {
  return proxyToApi(req, `/api/v1/auth/me${req.nextUrl.search}`)
}

export const GET = handle
export const HEAD = handle
