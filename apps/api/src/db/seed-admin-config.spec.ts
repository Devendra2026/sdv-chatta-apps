import {
  DEV_DEFAULT_ADMIN_EMAIL,
  MIN_ADMIN_PASSWORD_LENGTH,
  resolveSeedAdminConfig,
  resolveSeedAdminEmail,
} from "./seed-admin-config"

describe("resolveSeedAdminConfig", () => {
  it("requires password in production and does not use a source default", () => {
    expect(() =>
      resolveSeedAdminConfig({
        NODE_ENV: "production",
        SEED_ADMIN_EMAIL: "admin@example.com",
      })
    ).toThrow(/SEED_ADMIN_PASSWORD/)
  })

  it("requires email in production", () => {
    expect(() =>
      resolveSeedAdminConfig({
        NODE_ENV: "production",
        SEED_ADMIN_PASSWORD: "strong-pass-1",
      })
    ).toThrow(/SEED_ADMIN_EMAIL/)
  })

  it("accepts SUPER_ADMIN_* aliases", () => {
    const config = resolveSeedAdminConfig({
      NODE_ENV: "production",
      SUPER_ADMIN_EMAIL: "ops@example.com",
      SUPER_ADMIN_NAME: "Ops Admin",
      SUPER_ADMIN_PASSWORD: "strong-pass-1",
    })
    expect(config).toEqual({
      email: "ops@example.com",
      name: "Ops Admin",
      password: "strong-pass-1",
    })
  })

  it("prefers SUPER_ADMIN_* over SEED_ADMIN_*", () => {
    const config = resolveSeedAdminConfig({
      SUPER_ADMIN_EMAIL: "a@example.com",
      SEED_ADMIN_EMAIL: "b@example.com",
      SUPER_ADMIN_PASSWORD: "super-pass-1",
      SEED_ADMIN_PASSWORD: "seed-pass-1",
    })
    expect(config.email).toBe("a@example.com")
    expect(config.password).toBe("super-pass-1")
  })

  it("uses the local default email when not in production", () => {
    expect(
      resolveSeedAdminEmail({
        NODE_ENV: "development",
      })
    ).toBe(DEV_DEFAULT_ADMIN_EMAIL)
  })

  it("rejects passwords shorter than Better Auth minimum", () => {
    expect(() =>
      resolveSeedAdminConfig({
        SEED_ADMIN_EMAIL: "admin@example.com",
        SEED_ADMIN_PASSWORD: "short",
      })
    ).toThrow(new RegExp(String(MIN_ADMIN_PASSWORD_LENGTH)))
  })

  it("normalizes email to lowercase", () => {
    const config = resolveSeedAdminConfig({
      SEED_ADMIN_EMAIL: "Admin@Example.COM",
      SEED_ADMIN_PASSWORD: "strong-pass-1",
    })
    expect(config.email).toBe("admin@example.com")
  })
})
