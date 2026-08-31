/**
 * Pure Better Auth option fragments (no better-auth imports) for unit tests
 * and shared wiring in createAuth.
 */
export function resolveTrustedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean)
}

/** Portal (and Traefik) sit in front of Nest; honor forwarded host/proto. */
export const advancedAuth = {
  trustedProxyHeaders: true as const,
}

export function resolvePublicAppUrl(): string {
  const raw =
    process.env.BETTER_AUTH_URL ??
    process.env.PUBLIC_APP_URL ??
    "http://localhost:3000"
  return raw.trim().replace(/\/+$/, "")
}

export type GoogleSocialConfig = {
  clientId: string
  clientSecret: string
  disableSignUp: true
  prompt: "select_account"
}

export function resolveGoogleSocialProvider():
  { google: GoogleSocialConfig } | Record<string, never> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!googleClientId || !googleClientSecret) {
    return {}
  }
  return {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      disableSignUp: true,
      prompt: "select_account",
    },
  }
}

export const emailPasswordInviteOnly = {
  enabled: true as const,
  disableSignUp: true as const,
  minPasswordLength: 8 as const,
  maxPasswordLength: 128 as const,
}

export const googleAccountLinking = {
  enabled: true as const,
  trustedProviders: ["google"] as const,
}
