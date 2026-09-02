import { INestApplication, ValidationPipe } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AuditModule } from "../../src/audit/audit.module"
import { AuthGuard } from "../../src/auth/auth.guard"
import { AuthModule } from "../../src/auth/auth.module"
import { hashPassword } from "../../src/auth/password-hash"
import { hashOpaqueToken } from "../../src/auth/token-hash"
import { AllExceptionsFilter } from "../../src/common/all-exceptions.filter"
import { SESSION_CACHE } from "../../src/auth/session-cache"
import { MemorySessionCache } from "../helpers/memory-session.cache"
import { PrismaModule } from "../../src/prisma/prisma.module"
import { PrismaService } from "../../src/prisma/prisma.service"
import { closeRedisClient } from "../../src/common/redis.client"
import { RbacModule } from "../../src/rbac/rbac.module"

const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "AdminPassword1!"
const TARGET_USER_ID = "user-target"

type StaffUser = {
  id: string
  email: string
  name: string
  phone: null
  status: string
  passwordHash: string
  userRoles: Array<{
    role: {
      code: string
      rolePermissions: Array<{ permission: { code: string } }>
    }
  }>
}

type SessionRow = {
  id: string
  tokenHash: string
  userId: string
  expiresAt: Date
  lastActiveAt: Date
  createdAt: Date
  updatedAt: Date
  ipAddress: string | null
  userAgent: string | null
}

type PasswordResetTokenRow = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  failedAttempts: number
  createdAt: Date
}

describe("Admin password reset link (e2e)", () => {
  let app: INestApplication<App>
  let adminPasswordHash: string
  let targetPasswordHash: string

  const sessions = new Map<string, SessionRow>()
  const passwordResetTokens = new Map<string, PasswordResetTokenRow>()
  const users = new Map<string, StaffUser>()

  const prisma = {
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) return users.get(where.email) ?? null
          if (where.id) {
            for (const user of users.values()) {
              if (user.id === where.id) return user
            }
          }
          return null
        }
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string }
          data: { passwordHash?: string }
        }) => {
          for (const [email, user] of users.entries()) {
            if (user.id !== where.id) continue
            users.set(email, {
              ...user,
              passwordHash: data.passwordHash ?? user.passwordHash,
            })
            return users.get(email)
          }
          return null
        }
      ),
    },
    userRole: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        for (const user of users.values()) {
          if (user.id === where.userId)
            return user.userRoles.map((ur) => ({ role: ur.role }))
        }
        return []
      }),
    },
    session: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: Omit<SessionRow, "id" | "createdAt" | "updatedAt">
        }) => {
          const row: SessionRow = {
            id: `sess-${sessions.size + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          }
          sessions.set(data.tokenHash, row)
          return row
        }
      ),
      findUnique: jest.fn(
        async ({ where }: { where: { tokenHash: string } }) => {
          return sessions.get(where.tokenHash) ?? null
        }
      ),
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        return [...sessions.values()].filter(
          (row) => row.userId === where.userId
        )
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string }
          data: Partial<SessionRow>
        }) => {
          for (const [tokenHash, row] of sessions.entries()) {
            if (row.id !== where.id) continue
            const updated = { ...row, ...data, updatedAt: new Date() }
            if (data.tokenHash && data.tokenHash !== tokenHash) {
              sessions.delete(tokenHash)
              sessions.set(data.tokenHash, updated)
            } else {
              sessions.set(tokenHash, updated)
            }
            return updated
          }
          return null
        }
      ),
      updateMany: jest.fn(async () => ({ count: 0 })),
      deleteMany: jest.fn(async ({ where }: { where: { userId?: string } }) => {
        let count = 0
        for (const [tokenHash, row] of [...sessions.entries()]) {
          if (where.userId && row.userId !== where.userId) continue
          sessions.delete(tokenHash)
          count += 1
        }
        return { count }
      }),
    },
    passwordResetToken: {
      deleteMany: jest.fn(
        async ({ where }: { where: { userId?: string; usedAt?: null } }) => {
          let count = 0
          for (const [tokenHash, row] of [...passwordResetTokens.entries()]) {
            if (where.userId && row.userId !== where.userId) continue
            if (where.usedAt === null && row.usedAt !== null) continue
            passwordResetTokens.delete(tokenHash)
            count += 1
          }
          return { count }
        }
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Omit<
            PasswordResetTokenRow,
            "id" | "createdAt" | "failedAttempts" | "usedAt"
          > & { failedAttempts?: number; usedAt?: Date | null }
        }) => {
          const row: PasswordResetTokenRow = {
            id: `reset-${passwordResetTokens.size + 1}`,
            createdAt: new Date(),
            failedAttempts: data.failedAttempts ?? 0,
            usedAt: data.usedAt ?? null,
            ...data,
          }
          passwordResetTokens.set(data.tokenHash, row)
          return row
        }
      ),
      findUnique: jest.fn(
        async ({ where }: { where: { tokenHash: string } }) => {
          return passwordResetTokens.get(where.tokenHash) ?? null
        }
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string }
          data: Partial<PasswordResetTokenRow>
        }) => {
          for (const [tokenHash, row] of passwordResetTokens.entries()) {
            if (row.id !== where.id) continue
            const updated = { ...row, ...data }
            passwordResetTokens.set(tokenHash, updated)
            return updated
          }
          return null
        }
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { userId?: string; usedAt?: null; id?: { not: string } }
          data: Partial<PasswordResetTokenRow>
        }) => {
          let count = 0
          for (const [tokenHash, row] of passwordResetTokens.entries()) {
            if (where.userId && row.userId !== where.userId) continue
            if (where.usedAt === null && row.usedAt !== null) continue
            if (where.id && "not" in where.id && row.id === where.id.not) {
              continue
            }
            passwordResetTokens.set(tokenHash, { ...row, ...data })
            count += 1
          }
          return { count }
        }
      ),
    },
    $transaction: jest.fn(async (ops: unknown[]) => {
      for (const op of ops) {
        await op
      }
      return []
    }),
    auditLog: {
      create: jest.fn(async () => ({})),
    },
  }

  beforeAll(async () => {
    adminPasswordHash = await hashPassword(ADMIN_PASSWORD)
    targetPasswordHash = await hashPassword("TargetPassword1!")

    users.set(ADMIN_EMAIL, {
      id: "admin-1",
      email: ADMIN_EMAIL,
      name: "Admin",
      phone: null,
      status: "ACTIVE",
      passwordHash: adminPasswordHash,
      userRoles: [
        {
          role: {
            code: "SUPER_ADMIN",
            rolePermissions: [
              { permission: { code: "user:update" } },
              { permission: { code: "dashboard:read" } },
            ],
          },
        },
      ],
    })

    users.set("target@example.com", {
      id: TARGET_USER_ID,
      email: "target@example.com",
      name: "Target User",
      phone: null,
      status: "ACTIVE",
      passwordHash: targetPasswordHash,
      userRoles: [
        {
          role: {
            code: "OPERATOR",
            rolePermissions: [{ permission: { code: "dashboard:read" } }],
          },
        },
      ],
    })

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, AuthModule, RbacModule],
      providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(SESSION_CACHE)
      .useValue(new MemorySessionCache())
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  beforeEach(() => {
    sessions.clear()
    passwordResetTokens.clear()
  })

  afterAll(async () => {
    await app.close()
    await closeRedisClient()
  })

  function sessionCookieFromLogin(res: request.Response): string {
    const setCookie = res.headers["set-cookie"]
    const cookies = Array.isArray(setCookie)
      ? setCookie
      : setCookie
        ? [setCookie]
        : []
    const sessionLine = cookies.find((line) =>
      line.startsWith("chhata_session=")
    )
    expect(sessionLine).toBeDefined()
    return sessionLine!.split(";")[0]!
  }

  async function adminCookie(): Promise<string> {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    expect(login.status).toBe(201)
    return sessionCookieFromLogin(login)
  }

  it("rejects unauthenticated admin reset-link requests", async () => {
    const res = await request(app.getHttpServer()).post(
      `/api/v1/users/${TARGET_USER_ID}/password-reset-link`
    )
    expect(res.status).toBe(401)
  })

  it("allows admin to generate a reset link and stores only token hash", async () => {
    const cookie = await adminCookie()
    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${TARGET_USER_ID}/password-reset-link`)
      .set("Cookie", cookie)

    expect(res.status).toBe(201)
    expect(res.body.data.resetUrl).toMatch(/reset-password\?token=/)
    expect(res.body.data.expiresAt).toBeDefined()
    expect(passwordResetTokens.size).toBe(1)

    const stored = [...passwordResetTokens.values()][0]!
    const rawToken = new URL(res.body.data.resetUrl).searchParams.get("token")!
    expect(stored.tokenHash).toBe(hashOpaqueToken(rawToken, "password-reset"))
    expect(stored.tokenHash).not.toBe(rawToken)
    expect(stored.userId).toBe(TARGET_USER_ID)
  })

  it("returns 404 for unknown user id", async () => {
    const cookie = await adminCookie()
    const res = await request(app.getHttpServer())
      .post("/api/v1/users/missing-user/password-reset-link")
      .set("Cookie", cookie)

    expect(res.status).toBe(404)
  })
})
