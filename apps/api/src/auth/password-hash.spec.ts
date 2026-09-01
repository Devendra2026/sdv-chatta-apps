import {
  hashPassword,
  shouldUpgradePasswordHash,
  verifyPassword,
} from "./password-hash"

describe("password-hash", () => {
  it("hashes and verifies with bcrypt", async () => {
    const hash = await hashPassword("test-password-1")
    expect(hash.startsWith("$2")).toBe(true)
    expect(await verifyPassword("test-password-1", hash)).toBe(true)
    expect(await verifyPassword("wrong", hash)).toBe(false)
    expect(shouldUpgradePasswordHash(hash)).toBe(false)
  })

  it("verifies legacy Better Auth scrypt hashes and flags upgrade", async () => {
    const legacy =
      "aac8d2567e1e192cf181c8b902cf4129:4bb5d1387efea193bf5a3a1434253bc953cc4c4b1b5a0324477934a5f2a1c079ee3ebab340b950e2b2caca40f133ca9ebfcd75ff40475af657f2f6e71647a760"
    expect(await verifyPassword("test1234", legacy)).toBe(true)
    expect(shouldUpgradePasswordHash(legacy)).toBe(true)
  })
})
