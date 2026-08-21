import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"
import { IsArray, IsOptional, IsString, MinLength } from "class-validator"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"

class UpsertRoleDto {
  @IsString()
  @MinLength(2)
  code!: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  permissionIds?: string[]
}

@Controller("api/v1/roles")
@UseGuards(AuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("role:read")
  async list() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: "asc" },
    })
    return {
      success: true,
      data: roles.map((r) => ({
        ...r,
        permissions: r.rolePermissions.map((rp) => rp.permission),
      })),
    }
  }

  @Post()
  @RequirePermission("role:create")
  async create(@Body() dto: UpsertRoleDto) {
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
    return { success: true, data: role }
  }

  @Patch(":id")
  @RequirePermission("role:update")
  async update(@Param("id") id: string, @Body() dto: Partial<UpsertRoleDto>) {
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
    return { success: true, data: role }
  }

  @Delete(":id")
  @RequirePermission("role:delete")
  async remove(@Param("id") id: string) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { id } })
    if (role.isSystem) {
      return {
        success: false,
        error: { code: "SYSTEM_ROLE", message: "System roles cannot be deleted" },
      }
    }
    await this.prisma.role.delete({ where: { id } })
    return { success: true, data: { id } }
  }
}

@Controller("api/v1/permissions")
@UseGuards(AuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("permission:read")
  async list() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    })
    return { success: true, data: permissions }
  }
}
