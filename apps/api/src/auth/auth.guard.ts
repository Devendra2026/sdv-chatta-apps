import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { isStaffRoleCode } from "@workspace/types"
import type { Request, Response } from "express"

import { PrismaService } from "../prisma/prisma.service"
import { AuthUser, IS_PUBLIC_KEY } from "./auth.decorators"
import { SessionService } from "./session.service"

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>()
    const response = context.switchToHttp().getResponse<Response>()

    const token = this.sessionService.readSessionToken(request)
    const session = await this.sessionService.findValidSession(token)

    if (!session) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      })
    }

    const refreshed = await this.sessionService.refreshSessionIfNeeded(session)
    if (refreshed) {
      this.sessionService.attachSessionCookie(
        response,
        refreshed.rawToken,
        refreshed.expiresAt
      )
    } else {
      await this.sessionService.touchSession(session.id)
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    })

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "User is inactive or not found",
      })
    }

    const roles = user.userRoles.map((ur) => ur.role.code)
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      ),
    ]

    if (!roles.some((code) => isStaffRoleCode(code))) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Staff portal access requires a valid staff role",
      })
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      roles,
      permissions,
    }

    return true
  }
}
