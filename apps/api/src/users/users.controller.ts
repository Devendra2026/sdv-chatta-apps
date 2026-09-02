import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common"
import {
  ASSIGNABLE_STAFF_ROLE_CODES,
  type AssignableStaffRoleCode,
} from "@workspace/types"
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator"
import type { Request } from "express"

import { AuditService } from "../audit/audit.service"
import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { PASSWORD_MIN_LENGTH } from "../auth/password-policy"
import { SessionService } from "../auth/session.service"
import { PrismaService } from "../prisma/prisma.service"
import { UsersService } from "./users.service"

class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(2)
  name!: string

  @ValidateIf((o: CreateUserDto) => !o.initialPassword)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password?: string

  @ValidateIf((o: CreateUserDto) => !o.password)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  initialPassword?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[]

  @IsOptional()
  @IsIn([...ASSIGNABLE_STAFF_ROLE_CODES])
  role?: AssignableStaffRoleCode
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"

  @IsOptional()
  @IsBoolean()
  active?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[]

  @IsOptional()
  @IsIn([...ASSIGNABLE_STAFF_ROLE_CODES])
  role?: AssignableStaffRoleCode
}

@Controller("api/v1/users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermission("user:read")
  async list(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    const { items, meta } = await this.usersService.list(
      Number(page),
      Number(pageSize)
    )
    return { success: true, data: items, meta }
  }

  @Post()
  @RequirePermission("user:create")
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    const plainPassword = dto.password ?? dto.initialPassword
    if (!plainPassword || plainPassword.length < PASSWORD_MIN_LENGTH) {
      throw new BadRequestException({
        code: "PASSWORD_TOO_SHORT",
        message: `Initial password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      })
    }

    const data = await this.usersService.create(
      {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        password: plainPassword,
        roleIds: dto.roleIds,
        role: dto.role,
      },
      actor
    )
    return { success: true, data }
  }

  @Patch(":id")
  @RequirePermission("user:update")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser
  ) {
    const status =
      dto.active === undefined ? dto.status : dto.active ? "ACTIVE" : "INACTIVE"

    const data = await this.usersService.update(
      id,
      {
        name: dto.name,
        phone: dto.phone,
        status,
        roleIds: dto.roleIds,
        role: dto.role,
      },
      actor
    )
    return { success: true, data }
  }

  @Post(":id/password-reset-link")
  @RequirePermission("user:update")
  async createPasswordResetLink(
    @Param("id") id: string,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      })
    }

    const created =
      await this.sessionService.createPasswordResetTokenForUser(id)
    if (!created) {
      throw new BadRequestException({
        code: "PASSWORD_ACCOUNT_NOT_FOUND",
        message: "This user does not have a password account to reset",
      })
    }

    await this.audit.log({
      action: "auth.password_reset_link_created",
      entity: "User",
      entityId: id,
      actorId: actor.id,
      ipAddress: req.ip || undefined,
    })

    return {
      success: true,
      data: {
        resetUrl: created.resetUrl,
        expiresAt: created.expiresAt.toISOString(),
      },
    }
  }

  @Delete(":id")
  @RequirePermission("user:delete")
  async deactivate(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    const data = await this.usersService.deactivate(id, actor)
    return { success: true, data }
  }
}
