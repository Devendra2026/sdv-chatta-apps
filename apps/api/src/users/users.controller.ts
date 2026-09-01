import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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

import { hashPassword } from "../auth/password-hash"
import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"

class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(2)
  name!: string

  @ValidateIf((o: CreateUserDto) => !o.initialPassword)
  @IsString()
  @MinLength(8)
  password?: string

  @ValidateIf((o: CreateUserDto) => !o.password)
  @IsString()
  @MinLength(8)
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
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveRoleIds(
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

  @Get()
  @RequirePermission("user:read")
  async list(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    const p = Number(page)
    const s = Number(pageSize)
    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip: (p - 1) * s,
        take: s,
        orderBy: { createdAt: "desc" },
        include: {
          userRoles: { include: { role: true } },
        },
      }),
    ])
    return {
      success: true,
      data: items.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ur.role),
      })),
      meta: {
        page: p,
        pageSize: s,
        total,
        totalPages: Math.ceil(total / s) || 1,
      },
    }
  }

  @Post()
  @RequirePermission("user:create")
  async create(@Body() dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase()
    const plainPassword = dto.password ?? dto.initialPassword
    if (!plainPassword || plainPassword.length < 8) {
      throw new BadRequestException({
        code: "PASSWORD_TOO_SHORT",
        message: "Initial password must be at least 8 characters",
      })
    }

    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: "USER_EMAIL_EXISTS",
        message: "A user with this email already exists",
      })
    }

    const hashed = await hashPassword(plainPassword)
    const roleIds = await this.resolveRoleIds(dto.roleIds, dto.role)

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
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

    return {
      success: true,
      data: {
        ...user,
        roles: user.userRoles.map((ur) => ur.role),
      },
    }
  }

  @Patch(":id")
  @RequirePermission("user:update")
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    const status =
      dto.active === undefined ? dto.status : dto.active ? "ACTIVE" : "INACTIVE"

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

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    })
    return {
      success: true,
      data: {
        ...user,
        roles: user.userRoles.map((ur) => ur.role),
      },
    }
  }
}
