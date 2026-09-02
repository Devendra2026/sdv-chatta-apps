import { Logger } from "@nestjs/common"
import nodemailer from "nodemailer"

const logger = new Logger("AuthEmail")

export class AuthEmailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthEmailDeliveryError"
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

async function sendMail(params: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const transport = createTransport()
  const from = process.env.SMTP_FROM?.trim()
  if (!transport || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new AuthEmailDeliveryError("SMTP is not configured")
    }
    logger.warn(`[dev] Email to ${params.to}: ${params.subject}\n${params.text}`)
    return
  }
  try {
    await transport.sendMail({ from, to: params.to, subject: params.subject, text: params.text })
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error"
    throw new AuthEmailDeliveryError(`Failed to send email: ${detail}`)
  }
}

export async function sendPasswordResetLinkEmail(params: {
  email: string
  resetUrl: string
}): Promise<void> {
  await sendMail({
    to: params.email,
    subject: "Nagar Panchayat Chhata — Password reset link",
    text: [
      "Nagar Panchayat Chhata — Staff Portal",
      "",
      "Use this link to reset your password (expires in 30 minutes):",
      params.resetUrl,
      "",
      "If you did not request this, ignore this email.",
    ].join("\n"),
  })
  if (isSmtpConfigured()) {
    logger.log(`Password reset link sent to ${params.email}`)
  } else {
    logger.warn(`[dev] Password reset URL for ${params.email}: ${params.resetUrl}`)
  }
}

export async function sendSecurityNotificationEmail(params: {
  email: string
  event: "password_changed" | "password_reset"
}): Promise<void> {
  const subject =
    params.event === "password_reset"
      ? "Nagar Panchayat Chhata — Password was reset"
      : "Nagar Panchayat Chhata — Password was changed"
  const body =
    params.event === "password_reset"
      ? "Your staff portal password was reset. If this was not you, contact an administrator immediately."
      : "Your staff portal password was changed. If this was not you, contact an administrator immediately."

  await sendMail({
    to: params.email,
    subject,
    text: ["Nagar Panchayat Chhata — Staff Portal", "", body].join("\n"),
  })
}
