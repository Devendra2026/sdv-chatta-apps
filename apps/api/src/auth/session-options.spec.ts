import {
  resolvePublicAppUrl,
  resolveSessionSecret,
  resolveTrustedOrigins,
  resolveUseSecureCookies,
} from "./session-options"

describe("session-options", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PUBLIC_APP_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3000,http://localhost:3001",
      SESSION_SECRET: "x".repeat(32),
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("resolves trusted portal origins", () => {
    expect(resolveTrustedOrigins()).toEqual([
      "http://localhost:3000",
      "http://localhost:3001",
    ])
    expect(resolvePublicAppUrl()).toBe("http://localhost:3000")
    expect(resolveUseSecureCookies()).toBe(false)
  })

  it("uses secure cookies when portal URL is https", () => {
    process.env.PUBLIC_APP_URL = "https://portal.example.com"
    expect(resolveUseSecureCookies()).toBe(true)
  })

  it("requires a long session secret in production", () => {
    process.env.NODE_ENV = "production"
    delete process.env.SESSION_SECRET
    delete process.env.BETTER_AUTH_SECRET
    expect(() => resolveSessionSecret()).toThrow(/SESSION_SECRET/)
  })
})
