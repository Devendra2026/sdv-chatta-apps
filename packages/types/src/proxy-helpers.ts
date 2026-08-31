export type CookiePair = { name: string; value: string }

/** Rebuild a Cookie header from parsed pairs (includes __Secure- names). */
export function cookieHeaderFromPairs(pairs: CookiePair[]): string | null {
  if (pairs.length === 0) return null
  return pairs.map(({ name, value }) => `${name}=${value}`).join("; ")
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
