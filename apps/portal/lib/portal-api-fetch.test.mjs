import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const srcPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "portal-api-fetch.ts"
)

describe("portal-api-fetch internal URL", () => {
  const src = readFileSync(srcPath, "utf8")

  it("normalizes API_INTERNAL_URL to origin only", () => {
    assert.match(src, /export function normalizeApiInternalOrigin/)
    assert.match(src, /new URL\(trimmed\)\.origin/)
    assert.match(src, /normalizeApiInternalOrigin\(raw\)/)
  })

  it("logs api build id and session cookie state on HTTP errors", () => {
    assert.match(src, /apiBuildId/)
    assert.match(src, /hasSessionCookie/)
    assert.match(src, /route_missing_or_wrong_backend/)
  })
})
