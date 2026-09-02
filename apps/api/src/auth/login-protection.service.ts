import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"
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

function storeUnavailable(): never {
  throw new ServiceUnavailableException({
    code: "AUTH_STORE_UNAVAILABLE",
    message: "Authentication store is unavailable",
  })
}

@Injectable()
export class LoginProtectionService {
  private readonly logger = new Logger(LoginProtectionService.name)

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
    if (delayMs > 0 && process.env.NODE_ENV !== "test") {
      await sleep(delayMs)
    }
    if (failures >= LOGIN_MAX_FAILURES) {
      await this.setLock(email)
      this.logger.warn("Temporary login lock applied")
      return { locked: true }
    }
    return { locked: false }
  }

  async clearLoginFailures(email: string): Promise<void> {
    const fail = emailKey(email)
    const lock = lockKey(email)
    try {
      await getRedisClient().del(fail, lock)
    } catch {
      storeUnavailable()
    }
  }

  private async getLockUntil(email: string): Promise<number | null> {
    const key = lockKey(email)
    try {
      const ttl = await getRedisClient().ttl(key)
      if (ttl > 0) return Date.now() + ttl * 1000
      return null
    } catch {
      storeUnavailable()
    }
  }

  private async setLock(email: string): Promise<void> {
    const key = lockKey(email)
    try {
      await getRedisClient().setex(key, LOGIN_LOCKOUT_SECONDS, "1")
    } catch {
      storeUnavailable()
    }
  }

  private async incrementFailures(email: string): Promise<number> {
    const key = emailKey(email)
    const windowSeconds = LOGIN_LOCKOUT_SECONDS
    try {
      const redis = getRedisClient()
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, windowSeconds)
      }
      return count
    } catch {
      storeUnavailable()
    }
  }
}
