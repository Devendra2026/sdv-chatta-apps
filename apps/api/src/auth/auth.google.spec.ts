import {
  emailPasswordInviteOnly,
  googleAccountLinking,
  resolveGoogleSocialProvider,
  resolvePublicAppUrl,
  resolveTrustedOrigins,
} from "./auth-options"

describe("auth-options invite-only Google", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BETTER_AUTH_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("disables public email signup and trusts Google linking", () => {
    expect(emailPasswordInviteOnly.disableSignUp).toBe(true)
    expect(googleAccountLinking.enabled).toBe(true)
    expect(googleAccountLinking.trustedProviders).toContain("google")
  })

  it("resolves Google with disableSignUp when credentials are set", () => {
    const social = resolveGoogleSocialProvider()
    expect(social.google?.disableSignUp).toBe(true)
    expect(social.google?.clientId).toBe("google-client-id")
    expect(resolvePublicAppUrl()).toBe("http://localhost:3000")
    expect(resolveTrustedOrigins()).toEqual(["http://localhost:3000"])
  })

  it("omits Google provider when credentials are missing", () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(resolveGoogleSocialProvider()).toEqual({})
  })
})
