import { Controller, Get, Req, Res } from "@nestjs/common"
import type { Request, Response } from "express"

import { Public } from "../auth/auth.decorators"
import { attachCsrfCookie, generateCsrfToken } from "./csrf"

@Controller("api/v1")
export class CsrfController {
  @Public()
  @Get("csrf")
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = generateCsrfToken()
    attachCsrfCookie(res, token)
    return {
      success: true,
      data: { token },
    }
  }
}
