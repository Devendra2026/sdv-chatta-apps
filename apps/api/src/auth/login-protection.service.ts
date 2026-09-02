import { Injectable, Logger, UnauthorizedException } from "@nestjs/common"
import { createHash } from "node:crypto"

import { getRedisClient } from "../common/redis.client"
import {
  LOGIN_LOCKOUT_SECONDS,
  LOGIN_MAX_FAILURES,
} from "./session.constants"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emailKey(email: string): string {
  const normalized = email.trim().toLowerCase()
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 32)
  return `login:fail:${hash}`
}

function lockKey(email: string): string {
  const normalized = email.trim().toLowerCase()
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 32)
  return `login:lock:${hash}`
}

@Injectable()
export class LoginProtectionService {
  private readonly logger = new Logger(LoginProtectionService.name)
  private readonly memoryFails = new Map<string, { count: number; resetAt: number }>()
  private readonly memoryLocks = new Map<string, number>()

  async assertLoginAllowed(email: string): Promise<void> {
    const lockedUntil = await this.getLockUntil(email)
    if (lockedUntil && lockedUntil > Date.now()) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      })
    }
  }

  async recordLoginFailure(email: string): Promise<{ locked: boolean }> {
    const failures = await this.incrementFailures(email)
    const delayMs = Math.min(failures * 500, 5000)
    if (delayMs > 0) {
      await sleep(delayMs)
    }
    if (failures >= LOGIN_MAX_FAILURES) {
      await this.setLock(email)
      this.logger.warn(`Temporary login lock applied for ${email.trim().toLowerCase()}`)
      return { locked: true }
    }
    return { locked: false }
  }

  async clearLoginFailures(email: string): Promise<void> {
    const redis = getRedisClient()
    const fail = emailKey(email)
    const lock = lockKey(email)
    if (redis) {
      await redis.del(fail, lock).catch(() => undefined)
      return
    }
    this.memoryFails.delete(fail)
    this.memoryLocks.delete(lock)
  }

  private async getLockUntil(email: string): Promise<number | null> {
    const redis = getRedisClient()
    const key = lockKey(email)
    if (redis) {
      const ttl = await redis.ttl(key)
      if (ttl > 0) return Date.now() + ttl * 1000
      return null
    }
    const until = this.memoryLocks.get(key)
    if (until && until > Date.now()) return until
    if (until) this.memoryLocks.delete(key)
    return null
  }

  private async setLock(email: string): Promise<void> {
    const redis = getRedisClient()
    const key = lockKey(email)
    if (redis) {
      await redis.setex(key, LOGIN_LOCKOUT_SECONDS, "1")
      return
    }
    this.memoryLocks.set(key, Date.now() + LOGIN_LOCKOUT_SECONDS * 1000)
  }

  private async incrementFailures(email: string): Promise<number> {
    const redis = getRedisClient()
    const key = emailKey(email)
    const windowSeconds = LOGIN_LOCKOUT_SECONDS
    if (redis) {
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, windowSeconds)
      }
      return count
    }
    const now = Date.now()
    const current = this.memoryFails.get(key)
    if (!current || current.resetAt < now) {
      this.memoryFails.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
      return 1
    }
    current.count += 1
    return current.count
  }
}
