import { assertRequiredEnv } from "./validate-env"

describe("assertRequiredEnv", () => {
  const baseProdEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://u:p@postgres:5432/chhata?schema=public",
    SESSION_SECRET: "x".repeat(32),
    REDIS_URL: "redis://:secret@redis:6379",
    PUBLIC_APP_URL: "https://portal.example.com",
    CORS_ORIGIN: "https://portal.example.com,https://www.example.com",
    STORAGE_DIR: "/app/uploads",
    SEED_ADMIN_EMAIL: "admin@example.com",
    SEED_ADMIN_PASSWORD: "strong-pass-1",
    PAYMENT_PROVIDER: "atom",
    ATOM_MERCH_ID: "merch-1",
    ATOM_PASSWORD: "txn-pass",
    ATOM_API_SECRET_KEY: "api-secret",
    ATOM_AES_REQUEST_KEY: "req-key",
    ATOM_AES_REQUEST_IV: "req-iv",
    ATOM_AES_RESPONSE_KEY: "res-key",
    ATOM_AES_RESPONSE_IV: "res-iv",
    ATOM_RETURN_URL: "https://www.example.com/propertytax/payment/return",
    ATOM_CALLBACK_URL:
      "https://www.example.com/api/v1/payments/gateway/callback",
  }

  it("passes when production env is complete", () => {
    expect(() =>
      assertRequiredEnv({ env: baseProdEnv, includeSeedAdmin: true })
    ).not.toThrow()
  })

  it("lists missing production variables", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://u:p@postgres:5432/chhata",
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/SESSION_SECRET/)
  })

  it("rejects sandbox payment provider in production", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          PAYMENT_PROVIDER: "sandbox",
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/PAYMENT_PROVIDER/)
  })

  it("requires PAYMENT_PROVIDER=atom in production", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          PAYMENT_PROVIDER: undefined,
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/PAYMENT_PROVIDER is required/)
  })

  it("rejects unknown payment provider in production", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          PAYMENT_PROVIDER: "other",
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/PAYMENT_PROVIDER must be atom/)
  })

  it("requires Atom merchant and AES secrets in production", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_MERCH_ID: "",
          ATOM_PASSWORD: "   ",
          ATOM_API_SECRET_KEY: undefined,
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/ATOM_MERCH_ID/)
  })

  it("requires ATOM_RETURN_URL and ATOM_CALLBACK_URL in production", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_RETURN_URL: undefined,
          ATOM_CALLBACK_URL: "",
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/ATOM_RETURN_URL/)
  })

  it("requires DATABASE_URL in all environments", () => {
    expect(() =>
      assertRequiredEnv({
        env: { NODE_ENV: "development" },
      })
    ).toThrow(/DATABASE_URL/)
  })

  it("requires REDIS_URL in all environments", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          NODE_ENV: "development",
          DATABASE_URL: "postgresql://u:p@localhost:5433/chhata",
          SESSION_SECRET: "x".repeat(32),
        },
      })
    ).toThrow(/REDIS_URL/)
  })

  it("includes seed admin errors when requested", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          SEED_ADMIN_EMAIL: undefined,
          SEED_ADMIN_PASSWORD: undefined,
          SUPER_ADMIN_EMAIL: undefined,
          SUPER_ADMIN_PASSWORD: undefined,
        },
        includeSeedAdmin: true,
      })
    ).toThrow(/SEED_ADMIN_EMAIL/)
  })
})
