import type { CachedSession, SessionCache } from "./session-cache"
import { getRedisClient } from "../common/redis.client"

const KEY_PREFIX = "session:"

export class RedisSessionCache implements SessionCache {
  private key(tokenHash: string): string {
    return `${KEY_PREFIX}${tokenHash}`
  }

  async get(tokenHash: string): Promise<CachedSession | null> {
    const raw = await getRedisClient().get(this.key(tokenHash))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as CachedSession
      if (
        typeof parsed.sessionId !== "string" ||
        typeof parsed.userId !== "string"
      ) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  async set(
    tokenHash: string,
    value: CachedSession,
    ttlSeconds: number
  ): Promise<void> {
    const ttl = Math.max(1, Math.floor(ttlSeconds))
    await getRedisClient().set(
      this.key(tokenHash),
      JSON.stringify(value),
      "EX",
      ttl
    )
  }

  async delete(tokenHash: string): Promise<void> {
    await getRedisClient().del(this.key(tokenHash))
  }

  async ping(): Promise<boolean> {
    try {
      return (await getRedisClient().ping()) === "PONG"
    } catch {
      return false
    }
  }
}
