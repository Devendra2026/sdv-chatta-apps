import { hashOpaqueToken, verifyOpaqueToken } from "./token-hash"

describe("token-hash", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SESSION_SECRET: "x".repeat(32),
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("produces a stable hex digest for the same raw token and purpose", () => {
    const first = hashOpaqueToken("session-token-abc", "session")
    const second = hashOpaqueToken("session-token-abc", "session")
    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it("uses different digests for different purposes", () => {
    const sessionHash = hashOpaqueToken("shared-value", "session")
    const resetHash = hashOpaqueToken("shared-value", "password-reset")
    expect(sessionHash).not.toBe(resetHash)
  })

  it("verifies matching opaque tokens", () => {
    const raw = "reset-link-token-value"
    const stored = hashOpaqueToken(raw, "password-reset")
    expect(verifyOpaqueToken(raw, stored, "password-reset")).toBe(true)
  })

  it("rejects wrong or empty tokens", () => {
    const stored = hashOpaqueToken("correct-token", "session")
    expect(verifyOpaqueToken("wrong-token", stored, "session")).toBe(false)
    expect(verifyOpaqueToken("", stored, "session")).toBe(false)
    expect(verifyOpaqueToken("correct-token", "", "session")).toBe(false)
  })
})
