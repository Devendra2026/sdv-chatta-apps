import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { isStaffRoleCode } from "@workspace/types"
import type { Request } from "express"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import {
  hashPassword,
  shouldUpgradePasswordHash,
  verifyPassword,
} from "./password-hash"
import { SessionService } from "./session.service"

export type LoginResult = {
  sessionToken: string
  expiresAt: Date
  userId: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService
  ) {}

  private clientIp(req: Request): string | undefined {
    return req.ip || undefined
  }

  async login(
    email: string,
    password: string,
    req: Request
  ): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      include: {
        userRoles: { include: { role: true } },
      },
    })

    if (!user?.passwordHash) {
      await this.audit.log({
        action: "auth.login_failed",
        entity: "User",
        ipAddress: this.clientIp(req),
        metadata: { email: normalized, reason: "invalid_credentials" },
      })
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      await this.audit.log({
        action: "auth.login_failed",
        entity: "User",
        entityId: user.id,
        ipAddress: this.clientIp(req),
        metadata: { email: normalized, reason: "invalid_credentials" },
      })
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      })
    }

    if (user.status !== "ACTIVE") {
      await this.audit.log({
        action: "auth.login_failed",
        entity: "User",
        entityId: user.id,
        ipAddress: this.clientIp(req),
        metadata: { email: normalized, reason: "user_inactive" },
      })
      throw new UnauthorizedException({
        code: "USER_INACTIVE",
        message: "User is inactive or suspended",
      })
    }

    const roles = user.userRoles.map((ur) => ur.role.code)
    if (!roles.some((code) => isStaffRoleCode(code))) {
      await this.audit.log({
        action: "auth.login_failed",
        entity: "User",
        entityId: user.id,
        ipAddress: this.clientIp(req),
        metadata: { email: normalized, reason: "not_staff" },
      })
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      })
    }

    if (shouldUpgradePasswordHash(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      })
    }

    const session = await this.sessionService.createSession(user.id, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    })

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await this.audit.log({
      action: "auth.login",
      entity: "User",
      entityId: user.id,
      actorId: user.id,
      ipAddress: this.clientIp(req),
    })

    return {
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      userId: user.id,
    }
  }

  async logout(req: Request, actorId?: string): Promise<void> {
    const token = this.sessionService.readSessionToken(req)
    await this.sessionService.deleteSessionByToken(token)
    await this.audit.log({
      action: "auth.logout",
      entity: "User",
      actorId,
      ipAddress: this.clientIp(req),
    })
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    })

    return [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      ),
    ]
  }
}
