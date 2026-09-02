import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const srcPath = join(dirname(fileURLToPath(import.meta.url)), "proxy-to-api.ts")

describe("portal proxyToApi cookie forwarding", () => {
  const src = readFileSync(srcPath, "utf8")

  it("snapshots the incoming Cookie header from NextRequest, not next/headers cookies()", () => {
    assert.match(src, /req\.headers\.get\("cookie"\)/)
    assert.match(src, /req\.cookies\.getAll\(\)/)
    assert.doesNotMatch(src, /from "next\/headers"/)
    assert.doesNotMatch(src, /await cookies\(\)/)
  })

  it("forwards Cookie on the upstream fetch and logs when it is missing", () => {
    assert.match(src, /headers\.set\("cookie", cookieHeader\)/)
    assert.match(src, /\[proxy-to-api\] cookie header missing/)
    assert.match(src, /headersToRecord\(headers\)/)
  })

  it("does not warn about missing session cookies on login or logout", () => {
    assert.match(src, /\/api\/v1\/auth\/login/)
    assert.match(src, /\/api\/v1\/auth\/logout/)
  })
})
