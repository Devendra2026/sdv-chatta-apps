import { Logger } from "@nestjs/common"
import nodemailer from "nodemailer"

const logger = new Logger("OtpEmail")

export type OtpEmailType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email"

export type OtpDeliveryResult = {
  channel: "smtp" | "dev-log"
  /** Present only in non-production when SMTP is not configured. */
  devOtp?: string
}

export class OtpEmailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OtpEmailDeliveryError"
  }
}

export function isSmtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim())
}

function createTransport(env: NodeJS.ProcessEnv = process.env) {
  const host = env.SMTP_HOST?.trim()
  const from = env.SMTP_FROM?.trim()
  if (!host || !from) return null

  const port = env.SMTP_PORT ? Number(env.SMTP_PORT) : 587
  const secure =
    env.SMTP_SECURE === "true" || env.SMTP_SECURE === "1" || port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      env.SMTP_USER?.trim() && env.SMTP_PASS
        ? { user: env.SMTP_USER.trim(), pass: env.SMTP_PASS }
        : undefined,
  })
}

function buildPasswordResetMessage(otp: string): {
  subject: string
  text: string
} {
  return {
    subject: "Nagar Panchayat Chhata — Password reset OTP / पासवर्ड रीसेट OTP",
    text: [
      "Nagar Panchayat Chhata — Staff Portal",
      "नगर पंचायत छाता — स्टाफ पोर्टल",
      "",
      "Your one-time password (OTP) to reset your account password:",
      "अपना पासवर्ड रीसेट करने के लिए आपका एक बार का OTP:",
      "",
      otp,
      "",
      "This code expires in 5 minutes. If you did not request this, ignore this email.",
      "यह कोड 5 मिनट में समाप्त हो जाएगा। यदि आपने यह अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें।",
    ].join("\n"),
  }
}

export async function sendOtpEmail(
  params: { email: string; otp: string; type: OtpEmailType },
  env: NodeJS.ProcessEnv = process.env
): Promise<OtpDeliveryResult> {
  if (params.type !== "forget-password") {
    logger.warn(`Unsupported OTP type for mail: ${params.type}`)
    return { channel: "dev-log" }
  }

  const transport = createTransport(env)
  const from = env.SMTP_FROM?.trim()

  if (!transport || !from) {
    if (env.NODE_ENV === "production") {
      logger.error(
        "SMTP is not configured; cannot send password-reset OTP in production"
      )
      throw new OtpEmailDeliveryError("SMTP is not configured")
    }
    logger.warn(
      `[dev] Password-reset OTP for ${params.email}: ${params.otp} (SMTP not configured — shown in API response for local dev)`
    )
    return { channel: "dev-log", devOtp: params.otp }
  }

  const { subject, text } = buildPasswordResetMessage(params.otp)

  try {
    await transport.sendMail({
      from,
      to: params.email,
      subject,
      text,
    })
    logger.log(`Password-reset OTP sent to ${params.email}`)
    return { channel: "smtp" }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error"
    logger.error(`Failed to send password-reset OTP to ${params.email}: ${detail}`)
    throw new OtpEmailDeliveryError(
      `Failed to send password-reset email: ${detail}`
    )
  }
}
