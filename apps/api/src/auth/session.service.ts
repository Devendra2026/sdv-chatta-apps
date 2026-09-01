import { Injectable } from "@nestjs/common"
import { randomBytes, randomInt, createHmac, timingSafeEqual } from "node:crypto"
import type { Request, Response } from "express"

import { PrismaService } from "../prisma/prisma.service"
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "./session.constants"
import {
  resolvePublicAppUrl,
  resolveSessionSecret,
  resolveUseSecureCookies,
} from "./session-options"
import { sendOtpEmail } from "./send-otp-email"

export type SessionRecord = {
  id: string
  token: string
  userId: string
  expiresAt: Date
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  generateSessionToken(): string {
    return randomBytes(32).toString("base64url")
  }

  async createSession(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SessionRecord> {
    const token = this.generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
    const session = await this.prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    })
    return session
  }

  async findValidSession(token: string | undefined): Promise<SessionRecord | null> {
    if (!token?.trim()) return null
    const session = await this.prisma.session.findUnique({
      where: { token: token.trim() },
    })
    if (!session) return null
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
      return null
    }
    return session
  }

  async deleteSessionByToken(token: string | undefined): Promise<void> {
    if (!token?.trim()) return
    await this.prisma.session.deleteMany({ where: { token: token.trim() } })
  }

  readSessionToken(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie
    if (!cookieHeader) return undefined
    for (const part of cookieHeader.split(";")) {
      const trimmed = part.trim()
      if (!trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) continue
      const value = trimmed.slice(SESSION_COOKIE_NAME.length + 1)
      if (value.trim()) return decodeURIComponent(value.trim())
    }
    return undefined
  }

  attachSessionCookie(res: Response, token: string, expiresAt: Date): void {
    const parts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Expires=${expiresAt.toUTCString()}`,
      `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
    ]
    if (this.shouldUseSecureCookie(res)) {
      parts.push("Secure")
    }
    res.append("Set-Cookie", parts.join("; "))
  }

  clearSessionCookie(res: Response): void {
    const parts = [
      `${SESSION_COOKIE_NAME}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]
    if (this.shouldUseSecureCookie(res)) {
      parts.push("Secure")
    }
    res.append("Set-Cookie", parts.join("; "))
  }

  private shouldUseSecureCookie(res: Response): boolean {
    if (resolveUseSecureCookies()) return true
    const forwarded = res.req?.headers["x-forwarded-proto"]
    const proto =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
      res.req?.protocol
    return proto === "https"
  }

  private hashOtp(otp: string): string {
    return createHmac("sha256", resolveSessionSecret())
      .update(`otp:${otp}`)
      .digest("hex")
  }

  private otpIdentifier(email: string): string {
    return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${email.trim().toLowerCase()}`
  }

  private parseOtpRecord(value: string): { hash: string; attempts: number } {
    const [hash, attemptsRaw] = value.split(":")
    return {
      hash: hash ?? "",
      attempts: Number(attemptsRaw ?? "0") || 0,
    }
  }

  private formatOtpRecord(hash: string, attempts: number): string {
    return `${hash}:${attempts}`
  }

  generateOtpCode(): string {
    return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0")
  }

  async requestPasswordResetOtp(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    })
    if (!user?.passwordHash) {
      return
    }

    const otp = this.generateOtpCode()
    const identifier = this.otpIdentifier(normalized)
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000)
    const value = this.formatOtpRecord(this.hashOtp(otp), 0)

    await this.prisma.verification.deleteMany({ where: { identifier } })
    await this.prisma.verification.create({
      data: { identifier, value, expiresAt },
    })

    await sendOtpEmail({
      email: normalized,
      otp,
      type: "forget-password",
    })
  }

  async verifyPasswordResetOtp(
    email: string,
    code: string,
    newPassword: string,
    hashNewPassword: (plain: string) => Promise<string>
  ): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const identifier = this.otpIdentifier(normalized)
    const record = await this.prisma.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
    })

    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new Error("OTP_EXPIRED")
    }

    const parsed = this.parseOtpRecord(record.value)
    if (parsed.attempts >= OTP_MAX_ATTEMPTS) {
      throw new Error("TOO_MANY_ATTEMPTS")
    }

    const submitted = code.trim()
    const expected = Buffer.from(parsed.hash, "hex")
    const actual = Buffer.from(this.hashOtp(submitted), "hex")
    const valid =
      expected.length === actual.length && timingSafeEqual(expected, actual)

    if (!valid) {
      await this.prisma.verification.update({
        where: { id: record.id },
        data: {
          value: this.formatOtpRecord(parsed.hash, parsed.attempts + 1),
        },
      })
      throw new Error("OTP_INVALID")
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    })
    if (!user) {
      throw new Error("OTP_INVALID")
    }

    const passwordHash = await hashNewPassword(newPassword)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.verification.deleteMany({ where: { identifier } }),
      this.prisma.session.deleteMany({ where: { userId: user.id } }),
    ])
  }
}

export function resolvePublicPortalOrigin(): string {
  return resolvePublicAppUrl()
}
