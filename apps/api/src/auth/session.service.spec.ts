import { MemorySessionCache } from "../../test/helpers/memory-session.cache"
import { SessionService } from "./session.service"

describe("SessionService", () => {
  const cache = new MemorySessionCache()
  const sessions = new Map<string, Record<string, unknown>>()

  const prisma = {
    session: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: "sess-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          revokedAt: null,
          ...data,
        }
        sessions.set(String(data.tokenHash), row)
        return row
      }),
      findUnique: jest.fn(async ({ where }: { where: { tokenHash: string } }) => {
        return sessions.get(where.tokenHash) ?? null
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        for (const [hash, row] of sessions.entries()) {
          if (row.id !== where.id) continue
          const updated = { ...row, ...data }
          sessions.set(hash, updated)
          return updated
        }
        return null
      }),
      updateMany: jest.fn(async ({ where, data }: { where: { tokenHash?: string }; data: Record<string, unknown> }) => {
        let count = 0
        for (const [hash, row] of [...sessions.entries()]) {
          if (where.tokenHash && row.tokenHash !== where.tokenHash) continue
          sessions.set(hash, { ...row, ...data })
          count += 1
        }
        return { count }
      }),
    },
  }

  const service = new SessionService(
    prisma as never,
    cache
  )

  beforeEach(async () => {
    sessions.clear()
    process.env.SESSION_SECRET = "test-session-secret-change-me-32ch"
  })

  it("creates a hashed session and resolves it from cache", async () => {
    const created = await service.createSession("user-1")
    expect(created.rawToken.length).toBeGreaterThan(20)
    expect(created.userId).toBe("user-1")

    const found = await service.findValidSession(created.rawToken)
    expect(found?.id).toBe(created.id)
    expect(found?.userId).toBe("user-1")
  })

  it("returns null for a missing token", async () => {
    await expect(service.findValidSession(undefined)).resolves.toBeNull()
    await expect(service.findValidSession("nope")).resolves.toBeNull()
  })

  it("revokes a session so later lookups fail", async () => {
    const created = await service.createSession("user-1")
    await service.deleteSessionByToken(created.rawToken)
    await expect(service.findValidSession(created.rawToken)).resolves.toBeNull()
  })
})
