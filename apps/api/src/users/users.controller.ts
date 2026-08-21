import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"
import { AuthService } from "../auth/auth.service"

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
  @IsString()
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"

  @IsOptional()
  roleIds?: string[]
}

@Controller("api/v1/users")
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

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
    const created = await this.authService.auth.api.signUpEmail({
      body: {
        email: dto.email,
        password: dto.password,
        name: dto.name,
      },
    })

    const userId = created.user.id
    if (dto.phone) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: dto.phone },
      })
    }
    if (dto.roleIds?.length) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      })
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    })
    return { success: true, data: user }
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
    return { success: true, data: user }
  }
}
