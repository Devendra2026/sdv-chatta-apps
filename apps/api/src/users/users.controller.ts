import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { PASSWORD_MIN_LENGTH } from "../auth/password-policy"
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
  constructor(private readonly usersService: UsersService) {}

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

  @Delete(":id")
  @RequirePermission("user:delete")
  async deactivate(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    const data = await this.usersService.deactivate(id, actor)
    return { success: true, data }
  }
}
