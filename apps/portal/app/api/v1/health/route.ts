import { NextRequest } from "next/server"

import { proxyToApi } from "@/lib/proxy-to-api"

export const dynamic = "force-dynamic"

async function handle(req: NextRequest) {
  return proxyToApi(req, `/api/v1/health${req.nextUrl.search}`)
}

export const GET = handle
export const HEAD = handle
