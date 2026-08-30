import { Logger } from "@nestjs/common"

import { sendOtpEmail } from "./send-otp-email"

describe("sendOtpEmail", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" }
    delete process.env.SMTP_HOST
    delete process.env.SMTP_FROM
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  it("logs OTP in development when SMTP is not configured", async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined)

    await sendOtpEmail({
      email: "staff@example.com",
      otp: "123456",
      type: "forget-password",
    })

    expect(warnSpy.mock.calls.flat().join(" ")).toContain("123456")
  })

  it("does not log OTP in production when SMTP is missing", async () => {
    process.env.NODE_ENV = "production"
    const errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined)
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined)

    await sendOtpEmail({
      email: "staff@example.com",
      otp: "654321",
      type: "forget-password",
    })

    const output = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .join(" ")
    expect(output).not.toContain("654321")
  })
})
