import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service"
import { createAuth, type Auth } from "./auth"

@Injectable()
export class AuthService {
  readonly auth: Auth

  constructor(private readonly prisma: PrismaService) {
    this.auth = createAuth(prisma)
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
