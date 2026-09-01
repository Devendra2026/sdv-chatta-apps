import { resolveSeedAdminConfig } from "../db/seed-admin-config"

export type ValidateEnvOptions = {
  /** Validate Super Admin seed credentials (container startup / seed-cli). */
  includeSeedAdmin?: boolean
  env?: NodeJS.ProcessEnv
}

function isProduction(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production"
}

function collectProductionErrors(env: NodeJS.ProcessEnv): string[] {
  const errors: string[] = []

  const sessionSecret =
    env.SESSION_SECRET?.trim() || env.BETTER_AUTH_SECRET?.trim()
  if (!sessionSecret || sessionSecret.length < 32) {
    errors.push(
      "SESSION_SECRET must be set in Dokploy (≥32 random chars). Generate with: openssl rand -base64 48"
    )
  }

  if (!env.REDIS_URL?.trim()) {
    errors.push(
      "REDIS_URL is required in production (set REDIS_PASSWORD in Dokploy; compose derives REDIS_URL)"
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
    errors.push("STORAGE_DIR is required in production (compose sets /app/uploads)")
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

  if (isProduction(env)) {
    errors.push(...collectProductionErrors(env))
  }

  if (options.includeSeedAdmin) {
    try {
      resolveSeedAdminConfig(env)
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Invalid Super Admin seed config"
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((line) => `  - ${line}`).join("\n")}`
    )
  }
}
