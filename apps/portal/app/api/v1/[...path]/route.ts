import { NextRequest } from "next/server"

import { proxyToApi } from "@/lib/proxy-to-api"

export const dynamic = "force-dynamic"

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params
  return proxyToApi(req, `/api/v1/${path.join("/")}${req.nextUrl.search}`)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
export const OPTIONS = handle
