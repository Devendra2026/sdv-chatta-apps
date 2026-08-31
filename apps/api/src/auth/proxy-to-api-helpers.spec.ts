import { cookieHeaderFromPairs, resolveForwardedProto } from "@workspace/types"

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
})
