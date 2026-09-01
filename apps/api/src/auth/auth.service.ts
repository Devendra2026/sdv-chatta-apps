import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { isStaffRoleCode } from "@workspace/types"
import type { Request } from "express"

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
    private readonly sessionService: SessionService
  ) {}

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
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      })
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException({
        code: "USER_INACTIVE",
        message: "User is inactive or suspended",
      })
    }

    const roles = user.userRoles.map((ur) => ur.role.code)
    if (!roles.some((code) => isStaffRoleCode(code))) {
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

    return {
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      userId: user.id,
    }
  }

  async logout(req: Request): Promise<void> {
    const token = this.sessionService.readSessionToken(req)
    await this.sessionService.deleteSessionByToken(token)
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
