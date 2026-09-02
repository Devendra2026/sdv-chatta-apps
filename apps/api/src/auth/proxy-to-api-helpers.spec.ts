import {
  authCookieExpiryVariants,
  collectAuthCookieNames,
  cookieHeaderFromPairs,
  describeCookieForwardingState,
  expiredAuthCookieHeaders,
  expiredLegacyAuthCookieHeaders,
  hasNonEmptySessionCookie,
  resolveCookieHeaderForProxy,
  resolveForwardedProto,
  serializeExpiredAuthCookie,
} from "@workspace/types"

describe("proxy-to-api helpers", () => {
  it("prefers Traefik x-forwarded-proto https over internal http request", () => {
    expect(
      resolveForwardedProto({
        forwardedProtoHeader: "https,http",
        publicAppUrl: null,
        originHeader: null,
        requestProtocol: "http:",
      })
    ).toBe("https")
  })

  it("falls back to NEXT_PUBLIC_APP_URL scheme when forwarded proto is missing", () => {
    expect(
      resolveForwardedProto({
        forwardedProtoHeader: null,
        publicAppUrl: "https://portal.npchhata.com",
        originHeader: null,
        requestProtocol: "http:",
      })
    ).toBe("https")
  })

  it("includes __Secure- session cookies in rebuilt Cookie header", () => {
    expect(
      cookieHeaderFromPairs([
        {
          name: "__Secure-better-auth.session_token",
          value: "abc123",
        },
      ])
    ).toBe("__Secure-better-auth.session_token=abc123")
  })

  it("returns null for empty cookie pairs", () => {
    expect(cookieHeaderFromPairs([])).toBeNull()
  })

  it("keeps a __Secure- session token even when a leftover empty cookie exists", () => {
    const header = resolveCookieHeaderForProxy(
      "__Secure-better-auth.session_token=new-session",
      [{ name: "better-auth.session_token", value: "" }]
    )
    expect(header).toContain("__Secure-better-auth.session_token=new-session")
  })

  it("does not let an empty leftover overwrite a real session cookie of the same name", () => {
    const header = resolveCookieHeaderForProxy(
      "better-auth.session_token=live-token",
      [{ name: "better-auth.session_token", value: "" }]
    )
    expect(header).toBe("better-auth.session_token=live-token")
  })

  it("omits empty leftover session cookies from the forwarded header", () => {
    const header = resolveCookieHeaderForProxy(
      "__Secure-better-auth.session_token=new-session",
      [{ name: "better-auth.session_token", value: "" }]
    )
    expect(header).toBe("__Secure-better-auth.session_token=new-session")
  })

  it("describeCookieForwardingState never includes cookie values", () => {
    const state = describeCookieForwardingState({
      rawHeader: "chhata_session=secret-token",
      forwardedHeader: "chhata_session=secret-token",
    })
    expect(state.hasRawCookieHeader).toBe(true)
    expect(state.hasSessionCookie).toBe(true)
    expect(state.parsedCookieNames).toEqual(["chhata_session"])
    expect(JSON.stringify(state)).not.toContain("secret-token")
  })

  it("falls back to the cookie jar when the raw header is empty", () => {
    expect(
      resolveCookieHeaderForProxy("", [
        { name: "__Secure-better-auth.session_token", value: "abc123" },
      ])
    ).toBe("__Secure-better-auth.session_token=abc123")
  })

  it("ignores empty session cookies when detecting a session", () => {
    expect(
      hasNonEmptySessionCookie([{ name: "chhata_session", value: "" }])
    ).toBe(false)
    expect(
      hasNonEmptySessionCookie([{ name: "chhata_session", value: "abc123" }])
    ).toBe(true)
  })

  it("collects chhata_session and legacy better-auth cookies on logout", () => {
    expect(collectAuthCookieNames(["better-auth.session_token.0"])).toContain(
      "chhata_session"
    )
    expect(collectAuthCookieNames(["better-auth.session_token.0"])).toContain(
      "better-auth.session_token"
    )
  })

  it("expires __Secure- cookies only with the Secure flag", () => {
    const variants = authCookieExpiryVariants(
      "__Secure-better-auth.session_token"
    )
    expect(variants.every((v) => v.secure)).toBe(true)
    expect(
      serializeExpiredAuthCookie("__Secure-better-auth.session_token", {
        httpOnly: true,
        secure: true,
      })
    ).toContain("Secure")
  })

  it("emits both Secure and non-Secure expiry headers for leftover cookies", () => {
    const headers = expiredAuthCookieHeaders(["better-auth.session_token"])
    expect(
      headers.some(
        (h) =>
          h.startsWith("better-auth.session_token=") && h.includes("Secure")
      )
    ).toBe(true)
    expect(
      headers.some(
        (h) =>
          h.startsWith("better-auth.session_token=") && !h.includes("Secure")
      )
    ).toBe(true)
  })

  it("expiredLegacyAuthCookieHeaders clears better-auth but not chhata_session", () => {
    const headers = expiredLegacyAuthCookieHeaders([
      "chhata_session",
      "better-auth.session_token",
    ])
    expect(headers.some((h) => h.startsWith("chhata_session="))).toBe(false)
    expect(
      headers.some((h) => h.startsWith("better-auth.session_token="))
    ).toBe(true)
  })
})
