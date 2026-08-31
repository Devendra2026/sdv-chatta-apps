export type CookiePair = { name: string; value: string }

/** Rebuild a Cookie header from parsed pairs (includes __Secure- names). */
export function cookieHeaderFromPairs(pairs: CookiePair[]): string | null {
  if (pairs.length === 0) return null
  return pairs.map(({ name, value }) => `${name}=${value}`).join("; ")
}

export function parseCookieHeader(
  header: string | null | undefined
): CookiePair[] {
  if (!header?.trim()) return []
  return header.split(";").flatMap((part) => {
    const trimmed = part.trim()
    if (!trimmed) return []
    const eq = trimmed.indexOf("=")
    if (eq <= 0) return []
    return [
      {
        name: trimmed.slice(0, eq).trim(),
        value: trimmed.slice(eq + 1),
      },
    ]
  })
}

function putCookie(
  map: Map<string, string>,
  name: string,
  value: string
): void {
  const existing = map.get(name)
  if (!existing?.trim() && value.trim()) {
    map.set(name, value)
    return
  }
  if (!map.has(name)) {
    map.set(name, value)
  }
}

/**
 * Merge the browser Cookie header with Next's cookie jar.
 * Never let an empty leftover `better-auth.session_token` replace a
 * non-empty `__Secure-` session cookie.
 */
export function mergeCookiePairs(
  rawHeader: string | null | undefined,
  jarPairs: CookiePair[] = []
): CookiePair[] {
  const map = new Map<string, string>()
  for (const pair of parseCookieHeader(rawHeader)) {
    putCookie(map, pair.name, pair.value)
  }
  for (const pair of jarPairs) {
    putCookie(map, pair.name, pair.value)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

export function resolveCookieHeaderForProxy(
  rawHeader: string | null | undefined,
  jarPairs: CookiePair[] = []
): string | null {
  return cookieHeaderFromPairs(mergeCookiePairs(rawHeader, jarPairs))
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
