import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const gatePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "components",
  "route-access-gate.tsx"
)
const layoutPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "app",
  "(app)",
  "layout.tsx"
)

describe("route access vs API unavailable", () => {
  const gate = readFileSync(gatePath, "utf8")
  const layout = readFileSync(layoutPath, "utf8")

  it("shows ApiUnavailablePanel when there is an error and no user", () => {
    assert.match(gate, /ApiUnavailablePanel/)
    assert.match(gate, /!user && isError/)
    assert.match(gate, /Access denied/)
  })

  it("layout renders ApiUnavailablePanel for unavailable sessions", () => {
    assert.match(layout, /session\.status === "unavailable"/)
    assert.match(layout, /ApiUnavailablePanel error=\{session\.error\}/)
    assert.match(
      layout,
      /if \(session\.status === "unavailable"\)[\s\S]*ApiUnavailablePanel/
    )
    assert.match(layout, /<RouteAccessGate>\{children\}<\/RouteAccessGate>/)
  })
})
