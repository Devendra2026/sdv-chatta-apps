import { formatIntegrationError } from "@workspace/types"

describe("formatIntegrationError", () => {
  it("formats code, message, and status", () => {
    expect(
      formatIntegrationError({
        code: "API_UNAVAILABLE",
        message: "Cannot reach API at api:4000",
        status: 502,
      })
    ).toBe("Cannot reach API at api:4000 (502: API_UNAVAILABLE)")
  })

  it("uses fallback when message is empty", () => {
    expect(
      formatIntegrationError({
        code: "REQUEST_FAILED",
        message: "",
        status: 500,
      })
    ).toBe("Request failed")
  })
})
