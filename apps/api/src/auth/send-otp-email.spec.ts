import { Logger } from "@nestjs/common"

import {
  OtpEmailDeliveryError,
  sendOtpEmail,
} from "./send-otp-email"

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

  it("returns devOtp in development when SMTP is not configured", async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined)

    const result = await sendOtpEmail({
      email: "staff@example.com",
      otp: "123456",
      type: "forget-password",
    })

    expect(result).toEqual({ channel: "dev-log", devOtp: "123456" })
    expect(warnSpy.mock.calls.flat().join(" ")).toContain("123456")
  })

  it("throws in production when SMTP is missing", async () => {
    process.env.NODE_ENV = "production"
    const errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined)
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined)

    await expect(
      sendOtpEmail({
        email: "staff@example.com",
        otp: "654321",
        type: "forget-password",
      })
    ).rejects.toThrow(OtpEmailDeliveryError)

    const output = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .join(" ")
    expect(output).not.toContain("654321")
  })
})
