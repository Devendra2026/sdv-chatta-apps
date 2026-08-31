import {
  authCookieExpiryVariants,
  collectAuthCookieNames,
  cookieHeaderFromPairs,
  expiredAuthCookieHeaders,
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

  it("prefers the raw Cookie header over an incomplete Next cookie jar", () => {
    expect(
      resolveCookieHeaderForProxy(
        "__Secure-better-auth.session_token=new-session",
        [{ name: "better-auth.session_token", value: "" }]
      )
    ).toBe("__Secure-better-auth.session_token=new-session")
  })

  it("falls back to the cookie jar when the raw header is empty", () => {
    expect(
      resolveCookieHeaderForProxy("", [
        { name: "__Secure-better-auth.session_token", value: "abc123" },
      ])
    ).toBe("__Secure-better-auth.session_token=abc123")
  })

  it("ignores empty leftover session cookies when detecting a session", () => {
    expect(
      hasNonEmptySessionCookie([
        { name: "better-auth.session_token", value: "" },
      ])
    ).toBe(false)
    expect(
      hasNonEmptySessionCookie([
        { name: "__Secure-better-auth.session_token", value: "abc123" },
      ])
    ).toBe(true)
  })

  it("collects chunked better-auth cookies from the request", () => {
    expect(
      collectAuthCookieNames(["better-auth.session_token.0"])
    ).toContain("better-auth.session_token.0")
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
        (h) => h.startsWith("better-auth.session_token=") && h.includes("Secure")
      )
    ).toBe(true)
    expect(
      headers.some(
        (h) =>
          h.startsWith("better-auth.session_token=") && !h.includes("Secure")
      )
    ).toBe(true)
  })
})
