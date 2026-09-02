import type { CachedSession, SessionCache } from "../../src/auth/session-cache"

export class MemorySessionCache implements SessionCache {
  private readonly store = new Map<
    string,
    { value: CachedSession; expiresAt: number }
  >()

  async get(tokenHash: string): Promise<CachedSession | null> {
    const row = this.store.get(tokenHash)
    if (!row) return null
    if (row.expiresAt <= Date.now()) {
      this.store.delete(tokenHash)
      return null
    }
    return row.value
  }

  async set(
    tokenHash: string,
    value: CachedSession,
    ttlSeconds: number
  ): Promise<void> {
    this.store.set(tokenHash, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    })
  }

  async delete(tokenHash: string): Promise<void> {
    this.store.delete(tokenHash)
  }

  async ping(): Promise<boolean> {
    return true
  }
}
