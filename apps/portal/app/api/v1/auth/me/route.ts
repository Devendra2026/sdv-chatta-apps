import { NextRequest } from "next/server"

import { proxyToApi } from "@/lib/proxy-to-api"

export const dynamic = "force-dynamic"

/**
 * Static route for GET /api/v1/auth/me. Other auth paths (login, logout, …) are
 * proxied by `auth/[...path]/route.ts` because this `auth/` segment prevents
 * `api/v1/[...path]` from matching sibling paths like `/api/v1/auth/login`.
 */
async function handle(req: NextRequest) {
  return proxyToApi(req, `/api/v1/auth/me${req.nextUrl.search}`)
}

export const GET = handle
export const HEAD = handle
