import { Injectable, Logger, NestMiddleware } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"

import { getRedisClient } from "./redis.client"

const WINDOW_MS = 60_000
const memoryHits = new Map<string, { count: number; resetAt: number }>()

export function getRateLimitMax(path: string): number {
  if (path.includes("/auth/login") || path.includes("/auth/forgot-password")) {
    return 20
  }
  if (path.includes("/public/property-tax")) return 30
  if (path.includes("/payments/gateway/")) return 120
  return 300
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name)

  use(req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${req.path}`
    const max = getRateLimitMax(req.path)
    const redis = getRedisClient()

    if (redis) {
      void this.applyRedisLimit(redis, key, max, res, next)
      return
    }

    this.applyMemoryLimit(key, max, res, next)
  }

  private async applyRedisLimit(
    redis: NonNullable<ReturnType<typeof getRedisClient>>,
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
        `Redis rate limit failed, falling back to in-memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      this.applyMemoryLimit(key, max, res, next)
    }
  }

  private applyMemoryLimit(
    key: string,
    max: number,
    res: Response,
    next: NextFunction
  ) {
    const now = Date.now()
    const current = memoryHits.get(key)
    if (!current || current.resetAt < now) {
      memoryHits.set(key, { count: 1, resetAt: now + WINDOW_MS })
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
