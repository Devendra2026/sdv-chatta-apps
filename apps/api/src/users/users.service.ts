import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import {
  ASSIGNABLE_STAFF_ROLE_CODES,
  type AssignableStaffRoleCode,
} from "@workspace/types"
import type { Role, User } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import type { AuthUser } from "../auth/auth.decorators"
import { hashPassword } from "../auth/password-hash"
import { SessionService } from "../auth/session.service"
import { PrismaService } from "../prisma/prisma.service"

type UserWithRoles = User & {
  userRoles: Array<{ role: Role }>
}

export type SafeUserDto = Omit<User, "passwordHash"> & {
  roles: Role[]
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService
  ) {}

  toSafeUser(user: UserWithRoles): SafeUserDto {
    const { passwordHash, userRoles, ...rest } = user
    void passwordHash
    return {
      ...rest,
      roles: userRoles.map((ur) => ur.role),
    }
  }

  async resolveRoleIds(
    roleIds?: string[],
    roleCode?: AssignableStaffRoleCode
  ): Promise<string[]> {
    if (roleIds?.length) {
      const roles = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
      })
      for (const r of roles) {
        if (
          !(ASSIGNABLE_STAFF_ROLE_CODES as readonly string[]).includes(r.code)
        ) {
          throw new BadRequestException({
            code: "INVALID_ROLE",
            message: `Role ${r.code} cannot be assigned via staff provisioning`,
          })
        }
      }
      return roleIds
    }

    if (roleCode) {
      const role = await this.prisma.role.findUnique({
        where: { code: roleCode },
      })
      if (!role) {
        throw new BadRequestException({
          code: "INVALID_ROLE",
          message: `Role ${roleCode} not found`,
        })
      }
      return [role.id]
    }

    const operator = await this.prisma.role.findUnique({
      where: { code: "OPERATOR" },
    })
    return operator ? [operator.id] : []
  }

  async list(page: number, pageSize: number) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          userRoles: { include: { role: true } },
        },
      }),
    ])

    return {
      items: items.map((u) => this.toSafeUser(u)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    }
  }

  async create(
    input: {
      email: string
      name: string
      phone?: string
      password: string
      roleIds?: string[]
      role?: AssignableStaffRoleCode
    },
    actor: AuthUser
  ): Promise<SafeUserDto> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: "USER_EMAIL_EXISTS",
        message: "A user with this email already exists",
      })
    }

    const hashed = await hashPassword(input.password)
    const roleIds = await this.resolveRoleIds(input.roleIds, input.role)

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          emailVerified: true,
          status: "ACTIVE",
          passwordHash: hashed,
        },
      })

      if (roleIds.length) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: created.id,
            roleId,
          })),
          skipDuplicates: true,
        })
      }

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { userRoles: { include: { role: true } } },
      })
    })

    await this.audit.log({
      action: "user.create",
      entity: "User",
      entityId: user.id,
      actorId: actor.id,
      newValue: {
        email: user.email,
        name: user.name,
        status: user.status,
        roles: user.userRoles.map((ur) => ur.role.code),
      },
    })

    return this.toSafeUser(user)
  }

  async update(
    id: string,
    dto: {
      name?: string
      phone?: string
      status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"
      roleIds?: string[]
      role?: AssignableStaffRoleCode
    },
    actor: AuthUser
  ): Promise<SafeUserDto> {
    const before = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    })
    if (!before) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      })
    }

    const status = dto.status
    const shouldRevokeSessions =
      status === "INACTIVE" || status === "SUSPENDED"
    const rolesChanging = Boolean(dto.roleIds?.length || dto.role)

    await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        status,
      },
    })

    if (dto.roleIds || dto.role) {
      const roleIds = await this.resolveRoleIds(dto.roleIds, dto.role)
      await this.prisma.userRole.deleteMany({ where: { userId: id } })
      if (roleIds.length) {
        await this.prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        })
      }
    }

    if (shouldRevokeSessions || rolesChanging) {
      await this.sessionService.revokeAllUserSessions(id)
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    })

    await this.audit.log({
      action: "user.update",
      entity: "User",
      entityId: id,
      actorId: actor.id,
      oldValue: {
        status: before.status,
        roles: before.userRoles.map((ur) => ur.role.code),
      },
      newValue: {
        status: user.status,
        roles: user.userRoles.map((ur) => ur.role.code),
      },
    })

    return this.toSafeUser(user)
  }

  async deactivate(id: string, actor: AuthUser): Promise<SafeUserDto> {
    if (id === actor.id) {
      throw new BadRequestException({
        code: "CANNOT_DEACTIVATE_SELF",
        message: "You cannot deactivate your own account",
      })
    }

    const before = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    })
    if (!before) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      })
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
      include: { userRoles: { include: { role: true } } },
    })

    await this.sessionService.revokeAllUserSessions(id)

    await this.audit.log({
      action: "user.deactivate",
      entity: "User",
      entityId: id,
      actorId: actor.id,
      oldValue: { status: before.status },
      newValue: { status: user.status },
    })

    return this.toSafeUser(user)
  }
}
