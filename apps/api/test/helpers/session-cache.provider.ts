import type { CachedSession, SessionCache } from "../../src/auth/session-cache"
import { SESSION_CACHE } from "../../src/auth/session-cache"
import { MemorySessionCache } from "./memory-session.cache"

export function memorySessionCacheProvider() {
  return {
    provide: SESSION_CACHE,
    useValue: new MemorySessionCache() as SessionCache,
  }
}

export function emptyCachedSession(
  overrides: Partial<CachedSession> = {}
): CachedSession {
  const now = new Date().toISOString()
  return {
    sessionId: "sess-1",
    userId: "user-1",
    createdAt: now,
    lastActivityAt: now,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  }
}
