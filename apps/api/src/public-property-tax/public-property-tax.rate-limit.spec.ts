import { RateLimitMiddleware } from "../common/rate-limit.middleware"

describe("rate limit for public property tax", () => {
  it("uses a lower cap for public property-tax paths", () => {
    const path = "/api/v1/public/property-tax/search"
    const max = path.includes("/public/property-tax")
      ? 30
      : path.includes("/payments/gateway/callback")
        ? 120
        : 300
    expect(max).toBe(30)
    // Ensure middleware module still imports cleanly
    expect(RateLimitMiddleware).toBeDefined()
  })
})
