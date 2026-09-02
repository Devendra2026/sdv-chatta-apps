import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { isStaffRoleCode } from "@workspace/types"
import type { Request, Response } from "express"

import { PrismaService } from "../prisma/prisma.service"
import { AuthUser, IS_PUBLIC_KEY } from "./auth.decorators"
import { SessionService } from "./session.service"

export type AuthDenyReason =
  | "missing_session_token"
  | "invalid_session"
  | "inactive_user"
  | "missing_staff_role"

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

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
      const reason: AuthDenyReason = token?.trim()
        ? "invalid_session"
        : "missing_session_token"
      this.logAuthDenial(request, reason)
      throw new UnauthorizedException({
        code:
          reason === "missing_session_token"
            ? "AUTH_SESSION_MISSING"
            : "AUTH_SESSION_INVALID",
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
      await this.sessionService.touchSession(session)
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
      this.logAuthDenial(request, "inactive_user")
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
      this.logAuthDenial(request, "missing_staff_role")
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

  private logAuthDenial(
    request: Request & { requestId?: string },
    reason: AuthDenyReason
  ): void {
    this.logger.warn(
      `auth denied route=${request.method} ${request.path} reason=${reason} requestId=${request.requestId ?? "-"} pid=${process.pid}`
    )
  }
}
