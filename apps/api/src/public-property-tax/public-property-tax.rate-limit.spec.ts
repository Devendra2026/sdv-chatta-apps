import { getRateLimitMax, RateLimitMiddleware } from "../common/rate-limit.middleware"

describe("rate limit for public property tax", () => {
  it("uses a lower cap for public property-tax paths", () => {
    const path = "/api/v1/public/property-tax/search"
    expect(getRateLimitMax(path)).toBe(30)
    expect(RateLimitMiddleware).toBeDefined()
  })

  it("uses a higher cap for gateway paths", () => {
    expect(getRateLimitMax("/api/v1/payments/gateway/callback")).toBe(120)
  })
})
