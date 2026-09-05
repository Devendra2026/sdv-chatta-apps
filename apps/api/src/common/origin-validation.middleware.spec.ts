import { isAtomGatewayPath } from "./origin-validation.middleware"

describe("isAtomGatewayPath", () => {
  it("matches Atom callback and return routes", () => {
    expect(isAtomGatewayPath("/api/v1/payments/gateway/callback")).toBe(true)
    expect(isAtomGatewayPath("/api/v1/payments/gateway/return")).toBe(true)
  })

  it("does not match staff payment APIs", () => {
    expect(isAtomGatewayPath("/api/v1/payments/online")).toBe(false)
    expect(isAtomGatewayPath("/api/v1/payments/123/refund")).toBe(false)
  })
})
