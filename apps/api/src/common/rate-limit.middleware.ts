import { Injectable, NestMiddleware } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"

const hits = new Map<string, { count: number; resetAt: number }>()

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${req.path}`
    const now = Date.now()
    const windowMs = 60_000
    const max = req.path.includes("/public/property-tax")
      ? 30
      : req.path.includes("/payments/gateway/")
        ? 120
        : 300
    const current = hits.get(key)
    if (!current || current.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    current.count += 1
    if (current.count > max) {
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      })
      return
    }
    return next()
  }
}
