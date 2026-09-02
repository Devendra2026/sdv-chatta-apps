/**
 * Portal-facing URL and cookie options for Nest-owned staff sessions.
 */

export function resolveTrustedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean)
}

export function resolvePublicAppUrl(): string {
  const raw = process.env.PUBLIC_APP_URL ?? "http://localhost:3000"
  return raw.trim().replace(/\/+$/, "")
}

export function resolveUseSecureCookies(): boolean {
  return resolvePublicAppUrl().startsWith("https://")
}

export function resolveSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set (≥32 random chars). Generate with: openssl rand -base64 48"
    )
  }
  return secret
}

export function assertTrustedOrigin(originHeader: string | undefined): void {
  if (!originHeader?.trim()) return
  const origin = originHeader.trim().replace(/\/+$/, "")
  const trusted = resolveTrustedOrigins()
  if (!trusted.includes(origin)) {
    throw new Error(`Untrusted origin: ${origin}`)
  }
}
