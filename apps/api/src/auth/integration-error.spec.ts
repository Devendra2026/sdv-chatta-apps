import {
  describeHttpFailure,
  formatIntegrationError,
} from "@workspace/types"

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

  it("appends path when the message does not already include it", () => {
    expect(
      formatIntegrationError({
        code: "UNAUTHORIZED",
        message: "Authentication required [401 GET /api/v1/auth/me at api:4000]",
        status: 401,
        path: "/api/v1/auth/me",
      })
    ).toBe(
      "Authentication required [401 GET /api/v1/auth/me at api:4000] (401: UNAUTHORIZED)"
    )
  })

  it("appends path when it is missing from the message", () => {
    expect(
      formatIntegrationError({
        code: "NOT_FOUND",
        message: "Request failed",
        status: 404,
        path: "/api/v1/auth/me",
      })
    ).toBe("Request failed (404: NOT_FOUND) [/api/v1/auth/me]")
  })
})

describe("describeHttpFailure", () => {
  it("includes method, path, and host for an empty 404", () => {
    expect(
      describeHttpFailure({
        status: 404,
        bodyMessage: "",
        statusText: "",
        method: "GET",
        path: "/api/v1/auth/me",
        host: "api:4000",
      })
    ).toBe("Not found: GET /api/v1/auth/me at api:4000")
  })

  it("prefers the JSON error body when present", () => {
    expect(
      describeHttpFailure({
        status: 404,
        bodyMessage: "Cannot GET /api/v1/auth/me",
        path: "/api/v1/auth/me",
        host: "api:4000",
      })
    ).toBe("Cannot GET /api/v1/auth/me")
  })

  it("appends status and path when the JSON body omits them", () => {
    expect(
      describeHttpFailure({
        status: 401,
        bodyMessage: "Authentication required",
        method: "GET",
        path: "/api/v1/auth/me",
        host: "api:4000",
      })
    ).toBe("Authentication required [401 GET /api/v1/auth/me at api:4000]")
  })
})
