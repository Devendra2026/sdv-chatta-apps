export const DEV_DEFAULT_ADMIN_EMAIL = "sikarwar2010@gmail.com"
export const DEV_DEFAULT_ADMIN_NAME = "Super Admin"
export const MIN_ADMIN_PASSWORD_LENGTH = 8

export type SeedAdminConfig = {
  email: string
  name: string
  password: string
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return ""
}

export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production"
}

export function resolveSeedAdminEmail(
  env: NodeJS.ProcessEnv = process.env
): string {
  const email = firstNonEmpty(
    env.SUPER_ADMIN_EMAIL,
    env.SEED_ADMIN_EMAIL,
    isProductionEnv(env) ? undefined : DEV_DEFAULT_ADMIN_EMAIL
  )
  return email.toLowerCase()
}

export function resolveSeedAdminConfig(
  env: NodeJS.ProcessEnv = process.env
): SeedAdminConfig {
  const email = resolveSeedAdminEmail(env)
  const name =
    firstNonEmpty(env.SUPER_ADMIN_NAME, env.SEED_ADMIN_NAME) ||
    DEV_DEFAULT_ADMIN_NAME
  const password = firstNonEmpty(
    env.SUPER_ADMIN_PASSWORD,
    env.SEED_ADMIN_PASSWORD
  )

  if (!email) {
    throw new Error(
      "SEED_ADMIN_EMAIL (or SUPER_ADMIN_EMAIL) is required to seed the Super Admin"
    )
  }

  if (!password) {
    throw new Error(
      isProductionEnv(env)
        ? "SEED_ADMIN_PASSWORD (or SUPER_ADMIN_PASSWORD) is required in production"
        : "SEED_ADMIN_PASSWORD (or SUPER_ADMIN_PASSWORD) is required to seed the Super Admin"
    )
  }

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `Super Admin password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`
    )
  }

  return { email, name, password }
}
