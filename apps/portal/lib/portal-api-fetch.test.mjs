import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const srcPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "portal-api-fetch.ts"
)
const nextConfigPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../next.config.ts"
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

  it("uses node:http to Nest instead of Next-patched global fetch", () => {
    assert.match(src, /from "node:http"/)
    assert.match(src, /from "node:dns\/promises"/)
    assert.match(src, /export (?:async )?function resolveAllowedConnectHost/)
    assert.match(src, /isAllowedApiConnectAddress/)
    assert.match(src, /127\.0\.0\.11/)
    assert.match(src, /agent:\s*false/)
    assert.match(src, /dns\.lookup/)
    assert.match(src, /connectHost/)
    assert.match(src, /requestHeaders\.host/)
    assert.doesNotMatch(src, /family:\s*4/)
    assert.match(src, /upstreamApiRequest\(url/)
    assert.doesNotMatch(
      src,
      /await fetch\(url,\s*\{\s*method,\s*headers,\s*cache: "no-store"/
    )
  })
})

describe("portal next.config does not rewrite /api to api:4000", () => {
  const src = readFileSync(nextConfigPath, "utf8")

  it("does not register http://api:4000 as a Next rewrite destination", () => {
    assert.doesNotMatch(src, /rewrites\s*\(/)
    assert.doesNotMatch(src, /api:4000/)
    assert.doesNotMatch(src, /API_INTERNAL_URL/)
  })
})
