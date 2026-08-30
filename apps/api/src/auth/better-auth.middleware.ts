import { Injectable, NestMiddleware } from "@nestjs/common"
import { toNodeHandler } from "better-auth/node"
import type { NextFunction, Request, Response } from "express"

import { AuthService } from "./auth.service"

/**
 * Express 5 + Nest @All("api/auth/*path") either misses nested paths or
 * leaves req.url/baseUrl in a shape better-call does not recognize, so
 * POST /api/auth/sign-in/email falls through to Nest's "Cannot POST" 404.
 *
 * Middleware runs before the Nest router. We force prefix-mount semantics:
 *   baseUrl=/api/auth  url=/sign-in/email
 */
@Injectable()
export class BetterAuthMiddleware implements NestMiddleware {
  private readonly handler: ReturnType<typeof toNodeHandler>

  constructor(authService: AuthService) {
    this.handler = toNodeHandler(authService.auth)
  }

  use(req: Request, res: Response, next: NextFunction) {
    const path = (req.originalUrl ?? req.url).split("?")[0] ?? ""
    if (!path.startsWith("/api/auth")) {
      return next()
    }
    req.baseUrl = "/api/auth"
    req.url = path.slice("/api/auth".length) || "/"
    return this.handler(req, res)
  }
}
