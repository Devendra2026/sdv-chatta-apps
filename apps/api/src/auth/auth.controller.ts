import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Patch,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common"
import { IsEmail, IsString, MinLength } from "class-validator"
import type { Request, Response } from "express"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import { CurrentUser, Public, type AuthUser } from "./auth.decorators"
import { AuthService } from "./auth.service"
import { hashPassword, verifyPassword } from "./password-hash"
import { assertTrustedOrigin } from "./session-options"
import { SessionService } from "./session.service"
import { OtpEmailDeliveryError } from "./send-otp-email"

class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string
}

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
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private guardTrustedOrigin(req: Request): void {
    try {
      assertTrustedOrigin(req.headers.origin)
    } catch {
      throw new ForbiddenException({
        code: "INVALID_ORIGIN",
        message: "Request origin is not allowed",
      })
    }
  }

  @Public()
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    this.guardTrustedOrigin(req)
    const result = await this.authService.login(dto.email, dto.password, req)
    this.sessionService.attachSessionCookie(
      res,
      result.sessionToken,
      result.expiresAt
    )
    return {
      success: true,
      data: { userId: result.userId },
    }
  }

  @Public()
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.guardTrustedOrigin(req)
    const token = this.sessionService.readSessionToken(req)
    const session = await this.sessionService.findValidSession(token)
    await this.authService.logout(req, session?.userId)
    this.sessionService.clearSessionCookie(res)
    return { success: true, data: { signedOut: true } }
  }

  @Get("me")
  @Header("Cache-Control", "private, no-store")
  me(@CurrentUser() user: AuthUser) {
    return {
      success: true,
      data: user,
    }
  }

  @Patch("me/password")
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request
  ) {
    this.guardTrustedOrigin(req)

    if (dto.newPassword.length < 8) {
      throw new BadRequestException({
        code: "PASSWORD_TOO_SHORT",
        message: "New password must be at least 8 characters",
      })
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser?.passwordHash) {
      throw new BadRequestException({
        code: "CREDENTIAL_ACCOUNT_NOT_FOUND",
        message: "No password account found for this user",
      })
    }

    const valid = await verifyPassword(dto.currentPassword, dbUser.passwordHash)
    if (!valid) {
      throw new BadRequestException({
        code: "INVALID_PASSWORD",
        message: "Current password is incorrect",
      })
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    })

    await this.audit.log({
      action: "auth.password_change",
      entity: "User",
      entityId: user.id,
      actorId: user.id,
      ipAddress: req.ip || undefined,
    })

    return {
      success: true,
      data: { changed: true },
    }
  }

  @Public()
  @Post("forgot-password")
  async forgotPasswordRequest(
    @Body() dto: ForgotPasswordRequestDto,
    @Req() req: Request
  ) {
    this.guardTrustedOrigin(req)
    const email = dto.email.trim().toLowerCase()

    try {
      const delivery = await this.sessionService.requestPasswordResetOtp(email)
      return {
        success: true,
        data: {
          message:
            "If an account exists for this email, a one-time code has been sent.",
          ...(delivery?.devOtp ? { devOtp: delivery.devOtp } : {}),
        },
      }
    } catch (err) {
      if (err instanceof OtpEmailDeliveryError) {
        throw new ServiceUnavailableException({
          code: "EMAIL_UNAVAILABLE",
          message:
            "Unable to send email right now. Try again later or contact an administrator.",
        })
      }
      throw err
    }
  }

  @Public()
  @Post("forgot-password/verify")
  async forgotPasswordVerify(
    @Body() dto: ForgotPasswordVerifyDto,
    @Req() req: Request
  ) {
    this.guardTrustedOrigin(req)
    const email = dto.email.trim().toLowerCase()

    try {
      await this.sessionService.verifyPasswordResetOtp(
        email,
        dto.code,
        dto.newPassword,
        hashPassword
      )
    } catch (err) {
      const code = err instanceof Error ? err.message : "OTP_INVALID"
      if (code === "TOO_MANY_ATTEMPTS") {
        throw new BadRequestException({
          code: "PASSWORD_RESET_FAILED",
          message: "Too many attempts. Request a new code.",
        })
      }
      throw new BadRequestException({
        code: "PASSWORD_RESET_FAILED",
        message: "Invalid or expired code. Request a new code and try again.",
      })
    }

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (user) {
      await this.audit.log({
        action: "auth.password_reset",
        entity: "User",
        entityId: user.id,
        ipAddress: req.ip || undefined,
      })
    }

    return {
      success: true,
      data: { reset: true },
    }
  }
}
