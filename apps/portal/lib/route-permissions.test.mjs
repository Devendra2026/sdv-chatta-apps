import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const srcPath = join(dirname(fileURLToPath(import.meta.url)), "route-permissions.ts")

describe("route-permissions", () => {
  const src = readFileSync(srcPath, "utf8")

  it("derives rules from NAV_ITEMS and matches longest prefix first", () => {
    assert.match(src, /flattenNavPermissions\(NAV_ITEMS\)/)
    assert.match(src, /b\.href\.length - a\.href\.length/)
    assert.match(src, /pathname\.startsWith\(`\$\{rule\.href\}\/`\)/)
  })

  it("uses OR semantics for permission arrays (sidebar parity)", () => {
    assert.match(src, /required\.some\(\(code\) => permissions\.includes\(code\)\)/)
    assert.match(src, /roles\.includes\("SUPER_ADMIN"\)/)
  })
})
