import { Controller, Get, UseGuards } from "@nestjs/common"

import { CurrentUser, type AuthUser } from "./auth.decorators"
import { AuthGuard } from "./auth.guard"

@Controller("api/v1/auth")
export class AuthMeController {
  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return {
      success: true,
      data: user,
    }
  }
}
