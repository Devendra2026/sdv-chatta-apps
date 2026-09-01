import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const routePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../app/api/v1/health/route.ts"
)

describe("portal health route", () => {
  it("exports GET and HEAD handlers that proxy /api/v1/health", () => {
    const src = readFileSync(routePath, "utf8")
    assert.match(src, /export const GET/)
    assert.match(src, /export const HEAD/)
    assert.match(src, /proxyToApi\(req, `\/api\/v1\/health\$\{req\.nextUrl\.search\}`\)/)
  })
})
