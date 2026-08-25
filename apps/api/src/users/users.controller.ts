import {
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
import { hashPassword } from "better-auth/crypto"
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"

const CREDENTIAL_ISSUER = "local:credential"

class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[]
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
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[]
}

@Controller("api/v1/users")
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

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
      meta: { page: p, pageSize: s, total, totalPages: Math.ceil(total / s) || 1 },
    }
  }

  @Post()
  @RequirePermission("user:create")
  async create(@Body() dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: "USER_EMAIL_EXISTS",
        message: "A user with this email already exists",
      })
    }

    const hashed = await hashPassword(dto.password)

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
          emailVerified: true,
          status: "ACTIVE",
        },
      })

      await tx.account.create({
        data: {
          accountId: created.id,
          providerId: "credential",
          issuer: CREDENTIAL_ISSUER,
          userId: created.id,
          password: hashed,
        },
      })

      let roleIds = dto.roleIds?.filter(Boolean) ?? []
      if (roleIds.length === 0) {
        const surveyor = await tx.role.findUnique({ where: { code: "SURVEYOR" } })
        if (surveyor) roleIds = [surveyor.id]
      }

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
    await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        status: dto.status,
      },
    })
    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } })
      if (dto.roleIds.length) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
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
