import { Injectable, Logger, NestMiddleware } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"

import { getRedisClient } from "./redis.client"

const WINDOW_MS = 60_000

export function getRateLimitMax(path: string): number {
  if (
    path.includes("/auth/login") ||
    path.includes("/auth/forgot-password") ||
    path.includes("/auth/reset-password")
  ) {
    return 20
  }
  if (path.includes("/public/property-tax")) return 30
  if (path.includes("/payments/gateway/")) return 120
  return 300
}

function unavailable(res: Response) {
  res.status(503).json({
    success: false,
    error: {
      code: "AUTH_STORE_UNAVAILABLE",
      message: "Rate limiter is unavailable",
    },
  })
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name)

  use(req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${req.path}`
    const max = getRateLimitMax(req.path)
    try {
      const redis = getRedisClient()
      void this.applyRedisLimit(redis, key, max, res, next)
    } catch (error) {
      this.logger.warn(
        `Redis rate limit unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      unavailable(res)
    }
  }

  private async applyRedisLimit(
    redis: ReturnType<typeof getRedisClient>,
    key: string,
    max: number,
    res: Response,
    next: NextFunction
  ) {
    const redisKey = `rate:${key}`
    try {
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.expire(redisKey, Math.ceil(WINDOW_MS / 1000))
      }
      if (count > max) {
        res.status(429).json({
          success: false,
          error: { code: "RATE_LIMITED", message: "Too many requests" },
        })
        return
      }
      next()
    } catch (error) {
      this.logger.warn(
        `Redis rate limit failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      unavailable(res)
    }
  }
}
