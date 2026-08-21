import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { fromNodeHeaders } from "better-auth/node"
import type { Request } from "express"

import { PrismaService } from "../prisma/prisma.service"
import type { AuthUser } from "./auth.decorators"
import { AuthService } from "./auth.service"

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>()

    const session = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session?.user) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      })
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
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

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      roles,
      permissions,
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return true
  }
}
