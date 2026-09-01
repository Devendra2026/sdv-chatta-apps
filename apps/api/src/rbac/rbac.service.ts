import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Permission } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import type { AuthUser } from "../auth/auth.decorators"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: "asc" },
    })
    return roles.map((r) => ({
      ...r,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }))
  }

  async createRole(
    dto: {
      code: string
      name: string
      description?: string
      permissionIds?: string[]
    },
    actor: AuthUser
  ) {
    const role = await this.prisma.role.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        rolePermissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    })

    await this.audit.log({
      action: "role.create",
      entity: "Role",
      entityId: role.id,
      actorId: actor.id,
      newValue: {
        code: role.code,
        permissionIds: dto.permissionIds ?? [],
      },
    })

    return role
  }

  async updateRole(
    id: string,
    dto: {
      code?: string
      name?: string
      description?: string
      permissionIds?: string[]
    },
    actor: AuthUser
  ) {
    const before = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: true },
    })
    if (!before) {
      throw new NotFoundException({
        code: "ROLE_NOT_FOUND",
        message: "Role not found",
      })
    }

    if (dto.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } })
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      })
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        code: dto.code?.toUpperCase(),
      },
      include: { rolePermissions: { include: { permission: true } } },
    })

    await this.audit.log({
      action: "role.update",
      entity: "Role",
      entityId: id,
      actorId: actor.id,
      oldValue: {
        code: before.code,
        permissionIds: before.rolePermissions.map((rp) => rp.permissionId),
      },
      newValue: {
        code: role.code,
        permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
      },
    })

    return role
  }

  async deleteRole(id: string, actor: AuthUser) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { id } })
    if (role.isSystem) {
      throw new BadRequestException({
        code: "SYSTEM_ROLE",
        message: "System roles cannot be deleted",
      })
    }

    await this.prisma.role.delete({ where: { id } })

    await this.audit.log({
      action: "role.delete",
      entity: "Role",
      entityId: id,
      actorId: actor.id,
      oldValue: { code: role.code, name: role.name },
    })

    return { id }
  }

  async listPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    })
  }
}
