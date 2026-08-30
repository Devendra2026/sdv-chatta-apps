import { toNodeHandler } from "better-auth/node"
import type { Express, NextFunction, Request, Response } from "express"

import type { Auth } from "./auth"

type AuthGate = {
  bind: (auth: Auth) => void
}

/**
 * Register Better Auth on the raw Express app *before* NestFactory attaches
 * its router. Nest's 404 ("Cannot POST /api/auth/sign-in/email") otherwise
 * wins because it is installed during create()/init() and never calls next().
 */
export function attachBetterAuthGate(server: Express): AuthGate {
  let handler: ReturnType<typeof toNodeHandler> | null = null

  server.use((req: Request, res: Response, next: NextFunction) => {
    const path = (req.originalUrl ?? req.url).split("?")[0] ?? ""
    if (!path.startsWith("/api/auth")) {
      return next()
    }
    if (!handler) {
      res.status(503).json({
        success: false,
        error: {
          code: "AUTH_NOT_READY",
          message: "Authentication is starting",
        },
      })
      return
    }
    req.baseUrl = "/api/auth"
    req.url = path.slice("/api/auth".length) || "/"
    return handler(req, res)
  })

  return {
    bind(auth: Auth) {
      handler = toNodeHandler(auth)
    },
  }
}
