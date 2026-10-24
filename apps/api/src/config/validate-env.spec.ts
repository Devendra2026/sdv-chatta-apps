import { assertRequiredEnv } from "./validate-env"

describe("assertRequiredEnv", () => {
  const aesKey = "A".repeat(32)
  const aesSalt = "B".repeat(32)
  const aesResKey = "C".repeat(32)
  const aesResSalt = "D".repeat(32)
  const baseProdEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://u:p@postgres:5432/chhata?schema=public",
    SESSION_SECRET: "x".repeat(32),
    REDIS_URL: "redis://:secret@redis:6379",
    PUBLIC_APP_URL: "https://portal.example.com",
    PUBLIC_WEB_URL: "https://www.example.com",
    CORS_ORIGIN: "https://portal.example.com,https://www.example.com",
    STORAGE_DIR: "/app/uploads",
    SEED_ADMIN_EMAIL: "admin@example.com",
    SEED_ADMIN_PASSWORD: "strong-pass-1",
    PAYMENT_PROVIDER: "atom",
    ATOM_MERCH_ID: "merch-1",
    ATOM_PASSWORD: "txn-pass",
    ATOM_API_SECRET_KEY: "api-secret",
    ATOM_REQ_HASH_KEY: "req-hash",
    ATOM_RESP_HASH_KEY: "resp-hash",
    ATOM_PRODUCT: "NAGAR",
    ATOM_SUB_CHANNEL: "UP",
    ATOM_CHECKOUT_ENV: "prod",
    ATOM_BASE_URL: "https://payment1.atomtech.in",
    ATOM_AUTH_URL: "https://payment1.atomtech.in/ots/aipay/auth",
    ATOM_CHECKOUT_CDN:
      "https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js",
    ATOM_REFUND_URL: "https://payment.atomtech.in/ots/payment/refund",
    ATOM_AES_REQUEST_KEY: aesKey,
    ATOM_AES_REQUEST_IV: aesSalt,
    ATOM_AES_RESPONSE_KEY: aesResKey,
    ATOM_AES_RESPONSE_IV: aesResSalt,
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
    let thrown = ""
    try {
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_MERCH_ID: "",
          ATOM_PASSWORD: "   ",
          ATOM_API_SECRET_KEY: undefined,
        },
        includeSeedAdmin: true,
      })
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error)
    }
    expect(thrown).toMatch(/ATOM_MERCH_ID/)
    expect(thrown).toMatch(/ATOM_PASSWORD/)
    expect(thrown).not.toMatch(/ATOM_API_SECRET_KEY is required/)
  })

  it("accepts canonical Atom names without a separate API secret or AES key", () => {
    const env: NodeJS.ProcessEnv = {
      ...baseProdEnv,
      ATOM_API_SECRET_KEY: undefined,
      ATOM_AES_REQUEST_KEY: undefined,
      ATOM_AES_RESPONSE_KEY: undefined,
      ATOM_AES_REQUEST_IV: "A".repeat(32),
      ATOM_AES_RESPONSE_IV: "B".repeat(32),
      ATOM_SUB_CHANNEL: undefined,
      ATOM_REFUND_URL: undefined,
      ATOM_PRODUCT: "NSE",
      ProductID: "NAGAR",
    }
    expect(() =>
      assertRequiredEnv({ env, includeSeedAdmin: true })
    ).not.toThrow()
    expect(env.ATOM_SUB_CHANNEL).toBe("UP")
    expect(env.ATOM_REFUND_URL).toBe(
      "https://payment.atomtech.in/ots/payment/refund"
    )
    expect(JSON.stringify(env.ATOM_PASSWORD)).not.toMatch(/api-secret/)
  })

  it("still fails when password or request encryption material is missing", () => {
    let thrown = ""
    try {
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_PASSWORD: " ",
          ATOM_AES_REQUEST_KEY: undefined,
          ATOM_AES_REQUEST_IV: "",
          ATOM_API_SECRET_KEY: undefined,
        },
      })
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error)
    }
    expect(thrown).toMatch(/ATOM_PASSWORD is required/)
    expect(thrown).toMatch(/ATOM_AES_REQUEST_IV is required/)
    expect(thrown).not.toMatch(/ATOM_AES_REQUEST_KEY is required/)
    expect(thrown).not.toMatch(/ATOM_API_SECRET_KEY is required/)
    expect(thrown).not.toContain("txn-pass")
  })

  it("rejects a refund URL on the auth host", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_REFUND_URL: "https://payment1.atomtech.in/ots/payment/refund",
        },
      })
    ).toThrow(/ATOM_REFUND_URL must be https:\/\/payment\.atomtech\.in/)
  })

  it("does not apply Atom credential checks when the provider is not atom", () => {
    let thrown = ""
    try {
      assertRequiredEnv({
        env: {
          NODE_ENV: "production",
          DATABASE_URL: baseProdEnv.DATABASE_URL,
          REDIS_URL: baseProdEnv.REDIS_URL,
          SESSION_SECRET: baseProdEnv.SESSION_SECRET,
          PUBLIC_APP_URL: baseProdEnv.PUBLIC_APP_URL,
          PUBLIC_WEB_URL: baseProdEnv.PUBLIC_WEB_URL,
          CORS_ORIGIN: baseProdEnv.CORS_ORIGIN,
          STORAGE_DIR: baseProdEnv.STORAGE_DIR,
          PAYMENT_PROVIDER: "sandbox",
        },
      })
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error)
    }
    expect(thrown).toMatch(/PAYMENT_PROVIDER must not be sandbox/)
    expect(thrown).not.toMatch(/ATOM_API_SECRET_KEY/)
    expect(thrown).not.toMatch(/ATOM_AES_/)
    expect(thrown).not.toMatch(/ATOM_SUB_CHANNEL/)
  })

  it("does not require Atom settings outside production", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          NODE_ENV: "test",
          DATABASE_URL: "postgresql://u:p@localhost:5433/chhata",
          REDIS_URL: "redis://localhost:6380",
          SESSION_SECRET: "x".repeat(32),
          PAYMENT_PROVIDER: "sandbox",
        },
      })
    ).not.toThrow()
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

  it("rejects a relative callback URL", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_CALLBACK_URL: "/api/v1/payments/gateway/callback",
        },
      })
    ).toThrow(/ATOM_CALLBACK_URL must be an absolute https URL/)
  })

  it("rejects a callback host that is not PUBLIC_WEB_URL", () => {
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_CALLBACK_URL:
            "https://portal.example.com/api/v1/payments/gateway/callback",
        },
      })
    ).toThrow(/ATOM_CALLBACK_URL host must match PUBLIC_WEB_URL/)
  })

  it("collapses a trailing slash on PUBLIC_WEB_URL before checking callbacks", () => {
    const env = {
      ...baseProdEnv,
      PUBLIC_WEB_URL: "https://www.example.com/",
      ATOM_RETURN_URL:
        "https://www.example.com//propertytax/payment/return",
      ATOM_CALLBACK_URL:
        "https://www.example.com//api/v1/payments/gateway/callback",
    }
    expect(() =>
      assertRequiredEnv({ env, includeSeedAdmin: true })
    ).not.toThrow()
    expect(env.PUBLIC_WEB_URL).toBe("https://www.example.com")
    expect(env.ATOM_CALLBACK_URL).toBe(
      "https://www.example.com/api/v1/payments/gateway/callback"
    )
  })

  it("requires the response hash key", () => {
    expect(() =>
      assertRequiredEnv({
        env: { ...baseProdEnv, ATOM_RESP_HASH_KEY: "  " },
      })
    ).toThrow(/ATOM_RESP_HASH_KEY/)
  })

  it("rejects a short AES key without echoing the value", () => {
    const badKey = "not-a-real-key"
    let thrown = ""
    try {
      assertRequiredEnv({
        env: { ...baseProdEnv, ATOM_AES_REQUEST_KEY: badKey },
      })
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error)
    }
    expect(thrown).toMatch(/ATOM_AES_REQUEST_KEY must be 32 hexadecimal/)
    expect(thrown).not.toContain(badKey)
  })

  it("requires UPI subchannel and the production auth URL", () => {
    expect(() =>
      assertRequiredEnv({
        env: { ...baseProdEnv, ATOM_SUB_CHANNEL: "NB" },
      })
    ).toThrow(/ATOM_SUB_CHANNEL must be UP/)
    expect(() =>
      assertRequiredEnv({
        env: {
          ...baseProdEnv,
          ATOM_AUTH_URL: "https://paynetzuat.atomtech.in/ots/aipay/auth",
        },
      })
    ).toThrow(/ATOM_AUTH_URL must be https:\/\/payment1\.atomtech\.in/)
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
