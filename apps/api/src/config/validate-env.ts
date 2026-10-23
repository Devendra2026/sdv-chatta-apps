import { resolveSeedAdminConfig } from "../db/seed-admin-config"

export type ValidateEnvOptions = {
  /** Validate Super Admin seed credentials (container startup / seed-cli). */
  includeSeedAdmin?: boolean
  env?: NodeJS.ProcessEnv
}

function isProduction(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production"
}

const AES_KEY_ENV = [
  "ATOM_AES_REQUEST_KEY",
  "ATOM_AES_REQUEST_IV",
  "ATOM_AES_RESPONSE_KEY",
  "ATOM_AES_RESPONSE_IV",
] as const

const AES_HEX_32 = /^[0-9A-Fa-f]{32}$/

/** Public Atom production endpoints. Not secrets. */
const PROD_ATOM_BASE_URL = "https://payment1.atomtech.in"
const PROD_ATOM_AUTH_URL = "https://payment1.atomtech.in/ots/aipay/auth"
const PROD_ATOM_CHECKOUT_CDN =
  "https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js"
const PROD_ATOM_REFUND_URL = "https://payment.atomtech.in/ots/payment/refund"

const CALLBACK_PATH = "/api/v1/payments/gateway/callback"
const GATEWAY_RETURN_PATH = "/api/v1/payments/gateway/return"
const CITIZEN_RETURN_PATH = "/propertytax/payment/return"

function collapseHttpSlashes(value: string): string {
  const trimmed = value.trim()
  const match = /^(https?:\/\/)([\s\S]*)$/i.exec(trimmed)
  if (!match?.[1] || match[2] === undefined) return trimmed
  return `${match[1]}${match[2].replace(/\/{2,}/g, "/")}`
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "")
}

/**
 * Collapse a trailing slash on PUBLIC_WEB_URL and the double slash it
 * produces in Compose-derived Atom return URLs. Does not invent a host.
 */
function normalizeProductionPaymentUrls(env: NodeJS.ProcessEnv): void {
  const web = env.PUBLIC_WEB_URL?.trim()
  if (web) env.PUBLIC_WEB_URL = stripTrailingSlashes(web)

  const urlKeys = [
    "ATOM_RETURN_URL",
    "ATOM_CALLBACK_URL",
    "ATOM_GATEWAY_RETURN_URL",
    "ATOM_BASE_URL",
    "ATOM_AUTH_URL",
    "ATOM_CHECKOUT_CDN",
    "ATOM_REFUND_URL",
  ] as const
  for (const key of urlKeys) {
    const value = env[key]?.trim()
    if (!value) continue
    const collapsed = collapseHttpSlashes(value)
    env[key] = key.endsWith("_CDN")
      ? collapsed
      : stripTrailingSlashes(collapsed)
  }
}

function pushHttpsOnWebOrigin(
  errors: string[],
  env: NodeJS.ProcessEnv,
  key: "ATOM_RETURN_URL" | "ATOM_CALLBACK_URL" | "ATOM_GATEWAY_RETURN_URL",
  expectedPath: string,
  webOrigin: string | null
): void {
  const value = env[key]?.trim()
  if (!value) {
    if (key === "ATOM_GATEWAY_RETURN_URL") return
    errors.push(
      key === "ATOM_RETURN_URL"
        ? "ATOM_RETURN_URL is required in production (compose sets ${PUBLIC_WEB_URL}/propertytax/payment/return)"
        : "ATOM_CALLBACK_URL is required in production (compose sets ${PUBLIC_WEB_URL}/api/v1/payments/gateway/callback)"
    )
    return
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    errors.push(`${key} must be an absolute https URL`)
    return
  }
  if (url.protocol !== "https:") {
    errors.push(`${key} must be an absolute https URL`)
    return
  }
  if (!webOrigin || url.origin !== webOrigin) {
    errors.push(`${key} host must match PUBLIC_WEB_URL`)
    return
  }
  if (url.pathname !== expectedPath) {
    errors.push(`${key} path must be ${expectedPath}`)
  }
}

function collectProductionErrors(env: NodeJS.ProcessEnv): string[] {
  normalizeProductionPaymentUrls(env)
  const errors: string[] = []

  const sessionSecret = env.SESSION_SECRET?.trim()
  if (!sessionSecret || sessionSecret.length < 32) {
    errors.push(
      "SESSION_SECRET must be set (≥32 random chars). Generate with: openssl rand -base64 48"
    )
  }

  if (!env.PUBLIC_APP_URL?.trim()) {
    errors.push(
      "PUBLIC_APP_URL is required in production (set PUBLIC_PORTAL_URL in Dokploy; compose maps it to PUBLIC_APP_URL)"
    )
  }

  if (!env.CORS_ORIGIN?.trim()) {
    errors.push(
      "CORS_ORIGIN is required in production (compose derives it from PUBLIC_PORTAL_URL and PUBLIC_WEB_URL)"
    )
  }

  if (!env.STORAGE_DIR?.trim()) {
    errors.push(
      "STORAGE_DIR is required in production (compose sets /app/uploads)"
    )
  }

  const paymentProvider = env.PAYMENT_PROVIDER?.trim().toLowerCase()
  if (!paymentProvider) {
    errors.push(
      "PAYMENT_PROVIDER is required in production (set PAYMENT_PROVIDER=atom)"
    )
  } else if (paymentProvider === "sandbox") {
    errors.push(
      "PAYMENT_PROVIDER must not be sandbox in production (set PAYMENT_PROVIDER=atom)"
    )
  } else if (paymentProvider !== "atom") {
    errors.push(
      `PAYMENT_PROVIDER must be atom in production (got "${paymentProvider}")`
    )
  }

  if (paymentProvider === "atom" || !paymentProvider) {
    const requiredAtomSecrets = [
      "ATOM_MERCH_ID",
      "ATOM_PASSWORD",
      "ATOM_API_SECRET_KEY",
      "ATOM_REQ_HASH_KEY",
      "ATOM_RESP_HASH_KEY",
      "ATOM_PRODUCT",
      ...AES_KEY_ENV,
    ] as const
    for (const key of requiredAtomSecrets) {
      if (!env[key]?.trim()) {
        errors.push(
          `${key} is required in production when using Atom AIPay (fill live credentials in Dokploy)`
        )
      }
    }

    const merchId = env.ATOM_MERCH_ID?.trim()
    if (merchId && merchId.length > 10) {
      errors.push("ATOM_MERCH_ID must be at most 10 characters")
    }
    const password = env.ATOM_PASSWORD?.trim()
    if (password && password.length > 80) {
      errors.push("ATOM_PASSWORD must be at most 80 characters")
    }
    const product = env.ATOM_PRODUCT?.trim()
    if (product && product.length > 50) {
      errors.push("ATOM_PRODUCT must be at most 50 characters")
    }

    for (const key of AES_KEY_ENV) {
      const value = env[key]?.trim()
      if (value && !AES_HEX_32.test(value)) {
        errors.push(`${key} must be 32 hexadecimal characters`)
      }
    }

    if (env.ATOM_SUB_CHANNEL?.trim() !== "UP") {
      errors.push(
        "ATOM_SUB_CHANNEL must be UP in production (UPI-only checkout)"
      )
    }
    if (env.ATOM_CHECKOUT_ENV?.trim().toLowerCase() !== "prod") {
      errors.push("ATOM_CHECKOUT_ENV must be prod in production")
    } else {
      env.ATOM_CHECKOUT_ENV = "prod"
    }

    const exactUrls = [
      ["ATOM_BASE_URL", PROD_ATOM_BASE_URL],
      ["ATOM_AUTH_URL", PROD_ATOM_AUTH_URL],
      ["ATOM_CHECKOUT_CDN", PROD_ATOM_CHECKOUT_CDN],
      ["ATOM_REFUND_URL", PROD_ATOM_REFUND_URL],
    ] as const
    for (const [key, expected] of exactUrls) {
      if (env[key]?.trim() !== expected) {
        errors.push(`${key} must be ${expected}`)
      }
    }

    let webOrigin: string | null = null
    const web = env.PUBLIC_WEB_URL?.trim()
    if (!web) {
      errors.push(
        "PUBLIC_WEB_URL is required in production (registered citizen site origin, no trailing slash)"
      )
    } else {
      try {
        const webUrl = new URL(web)
        if (webUrl.protocol !== "https:" || webUrl.pathname !== "/") {
          errors.push(
            "PUBLIC_WEB_URL must be an https origin with no path (no trailing slash)"
          )
        } else {
          webOrigin = webUrl.origin
        }
      } catch {
        errors.push(
          "PUBLIC_WEB_URL must be an https origin with no path (no trailing slash)"
        )
      }
    }

    pushHttpsOnWebOrigin(
      errors,
      env,
      "ATOM_RETURN_URL",
      CITIZEN_RETURN_PATH,
      webOrigin
    )
    pushHttpsOnWebOrigin(
      errors,
      env,
      "ATOM_CALLBACK_URL",
      CALLBACK_PATH,
      webOrigin
    )
    pushHttpsOnWebOrigin(
      errors,
      env,
      "ATOM_GATEWAY_RETURN_URL",
      GATEWAY_RETURN_PATH,
      webOrigin
    )
  }

  return errors
}

/**
 * Fail fast with a clear, multi-line message when required env vars are missing.
 * Called before migrations/seed in Docker and again when Nest boots.
 */
export function assertRequiredEnv(options: ValidateEnvOptions = {}): void {
  const env = options.env ?? process.env
  const errors: string[] = []

  if (!env.DATABASE_URL?.trim()) {
    errors.push(
      "DATABASE_URL is required (compose derives it from POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)"
    )
  }

  if (!env.REDIS_URL?.trim()) {
    errors.push(
      "REDIS_URL is required (local: redis://localhost:6380; production: compose derives it from REDIS_PASSWORD)"
    )
  }

  if (!env.SESSION_SECRET?.trim() && !env.BETTER_AUTH_SECRET?.trim()) {
    errors.push(
      "SESSION_SECRET is required (≥32 chars). Copy from apps/api/.env.example"
    )
  } else if (
    env.SESSION_SECRET?.trim() &&
    env.SESSION_SECRET.trim().length < 32
  ) {
    errors.push("SESSION_SECRET must be at least 32 characters")
  }

  if (isProduction(env)) {
    errors.push(...collectProductionErrors(env))
  }

  if (options.includeSeedAdmin) {
    try {
      resolveSeedAdminConfig(env)
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Invalid Super Admin seed config"
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((line) => `  - ${line}`).join("\n")}`
    )
  }
}
