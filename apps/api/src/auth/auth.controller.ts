import { All, Controller, OnModuleInit, Req, Res } from "@nestjs/common"
import { toNodeHandler } from "better-auth/node"
import type { Request, Response } from "express"

import { AuthService } from "./auth.service"

@Controller()
export class AuthController implements OnModuleInit {
  private handler!: ReturnType<typeof toNodeHandler>

  constructor(private readonly authService: AuthService) {}

  onModuleInit() {
    this.handler = toNodeHandler(this.authService.auth)
  }

  @All("api/auth/*path")
  async handle(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res)
  }
}
