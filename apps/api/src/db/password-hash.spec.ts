import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("password hashing module contract", () => {
  it("seed and user provisioning both use better-auth/crypto", () => {
    const seed = readFileSync(join(__dirname, "seed-database.ts"), "utf8")
    const users = readFileSync(
      join(__dirname, "../users/users.controller.ts"),
      "utf8"
    )
    expect(seed).toContain('from "better-auth/crypto"')
    expect(users).toContain('from "better-auth/crypto"')
  })
})
