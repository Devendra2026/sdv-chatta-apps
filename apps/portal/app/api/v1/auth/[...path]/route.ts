import { NextRequest } from "next/server"

import { proxyToApi } from "@/lib/proxy-to-api"

export const dynamic = "force-dynamic"

/**
 * Proxy Nest auth routes (login, logout, forgot-password, me/password, …).
 *
 * `api/v1/auth/me/route.ts` occupies the `auth/` tree, so sibling paths like
 * `/api/v1/auth/login` no longer match `api/v1/[...path]` and would 404 in
 * production unless handled here.
 */
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params
  return proxyToApi(req, `/api/v1/auth/${path.join("/")}${req.nextUrl.search}`)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
export const OPTIONS = handle
