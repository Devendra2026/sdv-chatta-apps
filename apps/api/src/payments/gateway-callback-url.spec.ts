const GATEWAY_CALLBACK_SUFFIX = "/api/v1/payments/gateway/callback"

function defaultCallbackUrl() {
  return (
    process.env.ATOM_CALLBACK_URL ??
    "http://localhost:4000/api/v1/payments/gateway/callback"
  )
}

describe("gateway callback URL (production web rewrite)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("default local callback targets the API directly", () => {
    delete process.env.ATOM_CALLBACK_URL
    expect(defaultCallbackUrl()).toBe(
      "http://localhost:4000/api/v1/payments/gateway/callback"
    )
  })

  it("production callback on web origin is valid for Next /api rewrite", () => {
    process.env.ATOM_CALLBACK_URL =
      "https://www.example.com/api/v1/payments/gateway/callback"
    const url = defaultCallbackUrl()
    expect(url.endsWith(GATEWAY_CALLBACK_SUFFIX)).toBe(true)
    expect(url.startsWith("https://")).toBe(true)
    // Next rewrites /api/:path* → API_INTERNAL_URL/api/:path*
    expect(new URL(url).pathname).toBe(GATEWAY_CALLBACK_SUFFIX)
  })
})
