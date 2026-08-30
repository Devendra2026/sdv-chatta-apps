import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"
import { hashPassword, verifyPassword } from "better-auth/crypto"
import { IsEmail, IsString, MinLength } from "class-validator"

import { CREDENTIAL_ISSUER, CREDENTIAL_PROVIDER_ID } from "../db/credential"
import { PrismaService } from "../prisma/prisma.service"
import { resolvePublicAppUrl } from "./auth-options"
import { CurrentUser, type AuthUser } from "./auth.decorators"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"

class ChangePasswordDto {
  @IsString()
  currentPassword!: string

  @IsString()
  @MinLength(8)
  newPassword!: string
}

class ForgotPasswordRequestDto {
  @IsEmail()
  email!: string
}

class ForgotPasswordVerifyDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(4)
  code!: string

  @IsString()
  @MinLength(8)
  newPassword!: string
}

@Controller("api/v1/auth")
export class AuthMeController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  private async postBetterAuth(path: string, body: Record<string, unknown>) {
    const baseUrl = resolvePublicAppUrl()
    const request = new Request(`${baseUrl}/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return this.authService.auth.handler(request)
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return {
      success: true,
      data: user,
    }
  }

  @Patch("me/password")
  @UseGuards(AuthGuard)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto
  ) {
    if (dto.newPassword.length < 8) {
      throw new BadRequestException({
        code: "PASSWORD_TOO_SHORT",
        message: "New password must be at least 8 characters",
      })
    }

    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: CREDENTIAL_PROVIDER_ID,
        issuer: CREDENTIAL_ISSUER,
        password: { not: null },
      },
    })

    if (!account?.password) {
      throw new BadRequestException({
        code: "CREDENTIAL_ACCOUNT_NOT_FOUND",
        message: "No password account found for this user",
      })
    }

    const valid = await verifyPassword({
      hash: account.password,
      password: dto.currentPassword,
    })

    if (!valid) {
      throw new BadRequestException({
        code: "INVALID_PASSWORD",
        message: "Current password is incorrect",
      })
    }

    const hashed = await hashPassword(dto.newPassword)
    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: hashed },
    })

    return {
      success: true,
      data: { changed: true },
    }
  }

  @Post("forgot-password")
  async forgotPasswordRequest(@Body() dto: ForgotPasswordRequestDto) {
    const email = dto.email.trim().toLowerCase()

    try {
      const response = await this.postBetterAuth(
        "/email-otp/request-password-reset",
        { email }
      )
      if (!response.ok) {
        await response.text()
      }
    } catch {
      // Always generic response — do not reveal whether email exists.
    }

    return {
      success: true,
      data: {
        message:
          "If an account exists for this email, a one-time code has been sent.",
      },
    }
  }

  @Post("forgot-password/verify")
  async forgotPasswordVerify(@Body() dto: ForgotPasswordVerifyDto) {
    const email = dto.email.trim().toLowerCase()

    try {
      const response = await this.postBetterAuth("/email-otp/reset-password", {
        email,
        otp: dto.code.trim(),
        password: dto.newPassword,
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new BadRequestException({
          code: "PASSWORD_RESET_FAILED",
          message: detail.includes("TOO_MANY_ATTEMPTS")
            ? "Too many attempts. Request a new code."
            : "Invalid or expired code. Request a new code and try again.",
        })
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new BadRequestException({
        code: "PASSWORD_RESET_FAILED",
        message: "Invalid or expired code. Request a new code and try again.",
      })
    }

    return {
      success: true,
      data: { reset: true },
    }
  }
}
