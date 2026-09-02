import { Injectable } from "@nestjs/common"
import { randomBytes } from "node:crypto"
import type { Request, Response } from "express"

import { PrismaService } from "../prisma/prisma.service"
import {
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_TTL_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  SESSION_TTL_SECONDS,
  sessionAbsoluteTimeoutSeconds,
  sessionCookieName,
  sessionIdleTimeoutSeconds,
} from "./session.constants"
import {
  resolvePublicAppUrl,
  resolveUseSecureCookies,
} from "./session-options"
import { hashOpaqueToken } from "./token-hash"

const SESSION_TOKEN_PURPOSE = "session"

export type SessionRecord = {
  id: string
  rawToken: string
  userId: string
  expiresAt: Date
  lastActiveAt: Date
  createdAt: Date
  ipAddress: string | null
  userAgent: string | null
}

export type SessionListItem = {
  id: string
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  current: boolean
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  generateSessionToken(): string {
    return randomBytes(32).toString("base64url")
  }

  private hashSessionToken(raw: string): string {
    return hashOpaqueToken(raw, SESSION_TOKEN_PURPOSE)
  }

  private toRecord(
    row: {
      id: string
      tokenHash: string
      userId: string
      expiresAt: Date
      lastActiveAt: Date
      createdAt: Date
      ipAddress: string | null
      userAgent: string | null
    },
    rawToken: string
  ): SessionRecord {
    return {
      id: row.id,
      rawToken,
      userId: row.userId,
      expiresAt: row.expiresAt,
      lastActiveAt: row.lastActiveAt,
      createdAt: row.createdAt,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    }
  }

  async createSession(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SessionRecord> {
    const rawToken = this.generateSessionToken()
    const tokenHash = this.hashSessionToken(rawToken)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000)
    const session = await this.prisma.session.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        lastActiveAt: now,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    })
    return this.toRecord(session, rawToken)
  }

  private isIdleExpired(lastActiveAt: Date): boolean {
    const idleMs = sessionIdleTimeoutSeconds() * 1000
    return lastActiveAt.getTime() + idleMs <= Date.now()
  }

  private isAbsoluteExpired(createdAt: Date): boolean {
    const absoluteMs = sessionAbsoluteTimeoutSeconds() * 1000
    return createdAt.getTime() + absoluteMs <= Date.now()
  }

  async findValidSession(rawToken: string | undefined): Promise<SessionRecord | null> {
    if (!rawToken?.trim()) return null
    const tokenHash = this.hashSessionToken(rawToken)
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
    })
    if (!session) return null

    if (
      session.expiresAt.getTime() <= Date.now() ||
      this.isIdleExpired(session.lastActiveAt) ||
      this.isAbsoluteExpired(session.createdAt)
    ) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
      return null
    }

    return this.toRecord(session, rawToken.trim())
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    })
  }

  async deleteSessionByToken(rawToken: string | undefined): Promise<void> {
    if (!rawToken?.trim()) return
    const tokenHash = this.hashSessionToken(rawToken)
    await this.prisma.session.deleteMany({ where: { tokenHash } })
  }

  async deleteSessionById(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    })
    return result.count > 0
  }

  async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string
  ): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        userId,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
    })
    return result.count
  }

  async listUserSessions(
    userId: string,
    currentSessionId?: string
  ): Promise<SessionListItem[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: "desc" },
    })
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      lastActiveAt: row.lastActiveAt,
      expiresAt: row.expiresAt,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      current: row.id === currentSessionId,
    }))
  }

  /**
   * Extend TTL and/or rotate token when near expiry.
   * Returns updated session with new raw token when rotation occurred.
   */
  async refreshSessionIfNeeded(
    session: SessionRecord
  ): Promise<SessionRecord | null> {
    const remainingMs = session.expiresAt.getTime() - Date.now()
    const needsRefresh =
      remainingMs < SESSION_REFRESH_THRESHOLD_SECONDS * 1000

    if (!needsRefresh) {
      await this.touchSession(session.id)
      return null
    }

    const rawToken = this.generateSessionToken()
    const tokenHash = this.hashSessionToken(rawToken)
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
    const updated = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash,
        expiresAt,
        lastActiveAt: new Date(),
      },
    })
    return this.toRecord(updated, rawToken)
  }

  readSessionToken(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie
    if (!cookieHeader) return undefined
    const names = new Set([sessionCookieName(), "chhata_session"])
    for (const part of cookieHeader.split(";")) {
      const trimmed = part.trim()
      for (const name of names) {
        if (!trimmed.startsWith(`${name}=`)) continue
        const value = trimmed.slice(name.length + 1)
        if (value.trim()) return decodeURIComponent(value.trim())
      }
    }
    return undefined
  }

  attachSessionCookie(res: Response, token: string, expiresAt: Date): void {
    const name = sessionCookieName()
    const parts = [
      `${name}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Expires=${expiresAt.toUTCString()}`,
      `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
    ]
    if (this.shouldUseSecureCookie(res) || name.startsWith("__Host-")) {
      parts.push("Secure")
    }
    res.append("Set-Cookie", parts.join("; "))
  }

  clearSessionCookie(res: Response): void {
    const name = sessionCookieName()
    const parts = [
      `${name}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]
    if (this.shouldUseSecureCookie(res) || name.startsWith("__Host-")) {
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

  passwordResetIdentifier(email: string): string {
    return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${email.trim().toLowerCase()}`
  }

  async createPasswordResetToken(email: string): Promise<{
    rawToken: string
    expiresAt: Date
  } | null> {
    const normalized = email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    })
    if (!user?.passwordHash) return null

    const rawToken = randomBytes(32).toString("base64url")
    const tokenHash = hashOpaqueToken(rawToken, "password-reset")
    const identifier = this.passwordResetIdentifier(normalized)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000)

    await this.prisma.verification.deleteMany({ where: { identifier } })
    await this.prisma.verification.create({
      data: {
        identifier,
        value: `${tokenHash}:0`,
        expiresAt,
      },
    })

    return { rawToken, expiresAt }
  }

  async consumePasswordResetToken(
    rawToken: string,
    email: string,
    hashNewPassword: (plain: string) => Promise<string>,
    newPassword: string
  ): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const identifier = this.passwordResetIdentifier(normalized)
    const record = await this.prisma.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
    })

    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new Error("RESET_TOKEN_EXPIRED")
    }

    const [storedHash, attemptsRaw] = record.value.split(":")
    const attempts = Number(attemptsRaw ?? "0") || 0
    if (attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      throw new Error("TOO_MANY_ATTEMPTS")
    }

    const submittedHash = hashOpaqueToken(rawToken.trim(), "password-reset")
    if (submittedHash !== storedHash) {
      await this.prisma.verification.update({
        where: { id: record.id },
        data: { value: `${storedHash}:${attempts + 1}` },
      })
      throw new Error("RESET_TOKEN_INVALID")
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    })
    if (!user) {
      throw new Error("RESET_TOKEN_INVALID")
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

export function buildPasswordResetUrl(rawToken: string): string {
  const base = resolvePublicAppUrl()
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`
}
