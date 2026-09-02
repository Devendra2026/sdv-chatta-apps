import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common"
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator"
import type { Request, Response } from "express"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import { CurrentUser, Public, type AuthUser } from "./auth.decorators"
import { AuthService } from "./auth.service"
import { hashPassword, verifyPassword } from "./password-hash"
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  assertPasswordPolicy,
} from "./password-policy"
import { assertTrustedOrigin } from "./session-options"
import { SessionService } from "./session.service"

class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string
}

class ChangePasswordDto {
  @IsString()
  currentPassword!: string

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string
}

class ResetPasswordDto {
  @IsString()
  @MinLength(16)
  token!: string

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string
}

class RevokeAllSessionsDto {
  @IsOptional()
  @IsBoolean()
  keepCurrent?: boolean
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
  @Post("register")
  register(@Req() req: Request) {
    this.guardTrustedOrigin(req)
    throw new ForbiddenException({
      code: "AUTH_REGISTER_DISABLED",
      message:
        "Staff accounts are provisioned by an administrator in Settings → Users",
    })
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

  @Get("sessions")
  @Header("Cache-Control", "private, no-store")
  async listSessions(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const token = this.sessionService.readSessionToken(req)
    const current = await this.sessionService.findValidSession(token)
    const sessions = await this.sessionService.listUserSessions(
      user.id,
      current?.id
    )
    return { success: true, data: { sessions } }
  }

  @Delete("sessions/:id")
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param("id") sessionId: string,
    @Req() req: Request
  ) {
    this.guardTrustedOrigin(req)
    const removed = await this.sessionService.deleteSessionById(
      sessionId,
      user.id
    )
    if (!removed) {
      throw new NotFoundException({
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
      })
    }
    await this.audit.log({
      action: "auth.session_revoked",
      entity: "Session",
      entityId: sessionId,
      actorId: user.id,
      ipAddress: req.ip || undefined,
    })
    return { success: true, data: { revoked: true } }
  }

  @Post("sessions/revoke-all")
  async revokeAllSessions(
    @CurrentUser() user: AuthUser,
    @Body() dto: RevokeAllSessionsDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    this.guardTrustedOrigin(req)
    const token = this.sessionService.readSessionToken(req)
    const current = await this.sessionService.findValidSession(token)
    const exceptId = dto.keepCurrent !== false ? current?.id : undefined
    const count = await this.sessionService.revokeAllUserSessions(
      user.id,
      exceptId
    )
    await this.audit.log({
      action: "auth.logout_all",
      entity: "User",
      entityId: user.id,
      actorId: user.id,
      ipAddress: req.ip || undefined,
      metadata: { revokedCount: count },
    })
    if (dto.keepCurrent === false) {
      this.sessionService.clearSessionCookie(res)
    }
    return { success: true, data: { revokedCount: count } }
  }

  @Patch("me/password")
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request
  ) {
    this.guardTrustedOrigin(req)
    assertPasswordPolicy(dto.newPassword)

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
  forgotPasswordRequest(@Req() req: Request) {
    this.guardTrustedOrigin(req)
    return {
      success: true,
      data: {
        message:
          "Password recovery must be initiated by an administrator. Please contact your municipal administrator for a reset link.",
      },
    }
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    this.guardTrustedOrigin(req)
    assertPasswordPolicy(dto.newPassword)

    let resetUserId: string
    try {
      const result = await this.sessionService.consumePasswordResetToken(
        dto.token,
        hashPassword,
        dto.newPassword
      )
      resetUserId = result.userId
    } catch (err) {
      const code = err instanceof Error ? err.message : "RESET_TOKEN_INVALID"
      if (code === "TOO_MANY_ATTEMPTS") {
        throw new BadRequestException({
          code: "PASSWORD_RESET_FAILED",
          message: "Too many attempts. Request a new reset link.",
        })
      }
      throw new BadRequestException({
        code: "PASSWORD_RESET_FAILED",
        message:
          "Invalid or expired reset link. Request a new one from an administrator.",
      })
    }

    await this.audit.log({
      action: "auth.password_reset",
      entity: "User",
      entityId: resetUserId,
      ipAddress: req.ip || undefined,
    })

    return {
      success: true,
      data: { reset: true },
    }
  }
}
