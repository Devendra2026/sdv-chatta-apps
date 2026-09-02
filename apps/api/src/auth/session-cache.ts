export const SESSION_CACHE = Symbol("SESSION_CACHE")

export type CachedSession = {
  sessionId: string
  userId: string
  createdAt: string
  lastActivityAt: string
  expiresAt: string
}

export interface SessionCache {
  get(tokenHash: string): Promise<CachedSession | null>
  set(
    tokenHash: string,
    value: CachedSession,
    ttlSeconds: number
  ): Promise<void>
  delete(tokenHash: string): Promise<void>
  ping(): Promise<boolean>
}
