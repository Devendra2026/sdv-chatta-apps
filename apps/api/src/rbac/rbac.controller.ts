import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common"
import { IsArray, IsOptional, IsString, MinLength } from "class-validator"

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { RbacService } from "./rbac.service"

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
export class RolesController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @RequirePermission("role:read")
  async list() {
    const data = await this.rbacService.listRoles()
    return { success: true, data }
  }

  @Post()
  @RequirePermission("role:create")
  async create(@Body() dto: UpsertRoleDto, @CurrentUser() actor: AuthUser) {
    const role = await this.rbacService.createRole(dto, actor)
    return { success: true, data: role }
  }

  @Patch(":id")
  @RequirePermission("role:update")
  async update(
    @Param("id") id: string,
    @Body() dto: Partial<UpsertRoleDto>,
    @CurrentUser() actor: AuthUser
  ) {
    const role = await this.rbacService.updateRole(id, dto, actor)
    return { success: true, data: role }
  }

  @Delete(":id")
  @RequirePermission("role:delete")
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    const data = await this.rbacService.deleteRole(id, actor)
    return { success: true, data }
  }
}

@Controller("api/v1/permissions")
export class PermissionsController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @RequirePermission("permission:read")
  async list() {
    const permissions = await this.rbacService.listPermissions()
    return { success: true, data: permissions }
  }
}
