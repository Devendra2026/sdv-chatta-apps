export type CookiePair = { name: string; value: string }

/** Rebuild a Cookie header from parsed pairs (includes __Secure- names). */
export function cookieHeaderFromPairs(pairs: CookiePair[]): string | null {
  if (pairs.length === 0) return null
  return pairs.map(({ name, value }) => `${name}=${value}`).join("; ")
}

/**
 * Forward the browser Cookie header as-is. Next.js `cookies().getAll()` can
 * omit `__Secure-` cookies or keep an empty leftover `better-auth.session_token`
 * that a non-Secure logout Set-Cookie created — that incomplete jar must not
 * replace the raw header.
 */
export function resolveCookieHeaderForProxy(
  rawHeader: string | null | undefined,
  jarPairs: CookiePair[] = []
): string | null {
  const raw = rawHeader?.trim()
  if (raw) return raw
  return cookieHeaderFromPairs(jarPairs)
}

export const AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "better-auth.dont_remember",
  "better-auth.account_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
  "__Secure-better-auth.dont_remember",
  "__Secure-better-auth.account_data",
] as const

export function isAuthCookieName(name: string): boolean {
  return (
    name.includes("better-auth") ||
    name.includes("session_token") ||
    name.includes("session_data")
  )
}

export function collectAuthCookieNames(existingNames: string[]): string[] {
  const names = new Set<string>(AUTH_COOKIE_NAMES)
  for (const name of existingNames) {
    if (isAuthCookieName(name)) names.add(name)
  }
  return [...names]
}

export type AuthCookieExpiryVariant = {
  httpOnly: boolean
  secure: boolean
}

/** Match Secure / HttpOnly combinations so leftover cookies actually expire. */
export function authCookieExpiryVariants(
  name: string
): AuthCookieExpiryVariant[] {
  const mustSecure = name.startsWith("__Secure-") || name.startsWith("__Host-")
  const secureFlags = mustSecure ? [true] : [true, false]
  const variants: AuthCookieExpiryVariant[] = []
  for (const secure of secureFlags) {
    variants.push({ httpOnly: true, secure })
    variants.push({ httpOnly: false, secure })
  }
  return variants
}

export function serializeExpiredAuthCookie(
  name: string,
  variant: AuthCookieExpiryVariant
): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
  ]
  if (variant.httpOnly) parts.push("HttpOnly")
  if (variant.secure) parts.push("Secure")
  return parts.join("; ")
}

export function expiredAuthCookieHeaders(existingNames: string[]): string[] {
  return collectAuthCookieNames(existingNames).flatMap((name) =>
    authCookieExpiryVariants(name).map((variant) =>
      serializeExpiredAuthCookie(name, variant)
    )
  )
}

export function hasNonEmptySessionCookie(
  pairs: Array<{ name: string; value: string }>
): boolean {
  return pairs.some(
    (c) =>
      (c.name.includes("better-auth.session_token") ||
        c.name.includes("session_token")) &&
      c.value.trim().length > 0
  )
}

export type ResolveForwardedProtoInput = {
  forwardedProtoHeader: string | null
  publicAppUrl: string | null
  originHeader: string | null
  requestProtocol: string
}

/**
 * Preserve Traefik's https when the portal container sees http internally.
 * Order: x-forwarded-proto → NEXT_PUBLIC_APP_URL → Origin → request protocol.
 */
export function resolveForwardedProto(
  input: ResolveForwardedProtoInput
): string {
  const fromHeader = input.forwardedProtoHeader?.split(",")[0]?.trim()
  if (fromHeader === "https" || fromHeader === "http") {
    return fromHeader
  }

  for (const candidate of [input.publicAppUrl, input.originHeader]) {
    if (!candidate) continue
    try {
      const proto = new URL(candidate).protocol.replace(":", "")
      if (proto === "https" || proto === "http") return proto
    } catch {
      // ignore invalid URL
    }
  }

  const fallback = input.requestProtocol.replace(":", "")
  return fallback === "https" || fallback === "http" ? fallback : "http"
}
