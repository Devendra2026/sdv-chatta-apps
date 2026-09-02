import { INestApplication, ValidationPipe } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AuditModule } from "../../src/audit/audit.module"
import { AuthGuard } from "../../src/auth/auth.guard"
import { AuthModule } from "../../src/auth/auth.module"
import { hashPassword } from "../../src/auth/password-hash"
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../src/common/csrf"
import { CsrfController } from "../../src/common/csrf.controller"
import { CsrfGuard } from "../../src/common/csrf.guard"
import { AllExceptionsFilter } from "../../src/common/all-exceptions.filter"
import { SESSION_CACHE } from "../../src/auth/session-cache"
import { MemorySessionCache } from "../helpers/memory-session.cache"
import { loginWithCsrf, parseSetCookie } from "../helpers/csrf-login"
import { PrismaModule } from "../../src/prisma/prisma.module"
import { PrismaService } from "../../src/prisma/prisma.service"
import { closeRedisClient } from "../../src/common/redis.client"

const STAFF_EMAIL = "staff@example.com"
const STAFF_PASSWORD = "StaffPassword1!"
const WRONG_PASSWORD = "WrongPassword1!"

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

describe("CSRF security (e2e)", () => {
  let app: INestApplication<App>
  let staffPasswordHash: string

  const sessions = new Map<string, SessionRow>()
  const users = new Map([
    [
      STAFF_EMAIL,
      {
        id: "user-1",
        email: STAFF_EMAIL,
        name: "Staff",
        phone: null,
        status: "ACTIVE",
        passwordHash: "",
        userRoles: [
          {
            role: {
              code: "SUPER_ADMIN",
              rolePermissions: [{ permission: { code: "dashboard:read" } }],
            },
          },
        ],
      },
    ],
  ])

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return users.get(where.email) ?? null
        if (where.id) {
          for (const user of users.values()) {
            if (user.id === where.id) return user
          }
        }
        return null
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { passwordHash?: string } }) => {
        for (const [email, user] of users.entries()) {
          if (user.id !== where.id) continue
          users.set(email, {
            ...user,
            passwordHash: data.passwordHash ?? user.passwordHash,
          })
          return users.get(email)
        }
        return null
      }),
    },
    userRole: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        for (const user of users.values()) {
          if (user.id === where.userId) return user.userRoles.map((ur) => ({ role: ur.role }))
        }
        return []
      }),
    },
    session: {
      create: jest.fn(async ({ data }: { data: Omit<SessionRow, "id" | "createdAt" | "updatedAt"> }) => {
        const row: SessionRow = {
          id: "sess-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }
        sessions.set(data.tokenHash, row)
        return row
      }),
      findUnique: jest.fn(async ({ where }: { where: { tokenHash: string } }) => {
        return sessions.get(where.tokenHash) ?? null
      }),
      findFirst: jest.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        return [...sessions.values()].find(
          (row) => row.id === where.id && row.userId === where.userId
        ) ?? null
      }),
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        return [...sessions.values()].filter((row) => row.userId === where.userId)
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<SessionRow> }) => {
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
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    verification: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      create: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
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
    staffPasswordHash = await hashPassword(STAFF_PASSWORD)
    users.set(STAFF_EMAIL, {
      ...users.get(STAFF_EMAIL)!,
      passwordHash: staffPasswordHash,
    })

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, AuthModule],
      controllers: [CsrfController],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(SESSION_CACHE)
      .useValue(new MemorySessionCache())
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true })
    )
    await app.init()
  })

  beforeEach(() => {
    sessions.clear()
    users.set(STAFF_EMAIL, {
      ...users.get(STAFF_EMAIL)!,
      passwordHash: staffPasswordHash,
    })
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
    await closeRedisClient()
  })

  async function loginSessionCookie(): Promise<string> {
    const login = await loginWithCsrf(app, STAFF_EMAIL, STAFF_PASSWORD)
    expect(login.status).toBe(201)
    return parseSetCookie(login.headers["set-cookie"])
  }

  it("GET /api/v1/csrf issues a double-submit cookie and body token", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/csrf")

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(typeof res.body.data.token).toBe("string")
    expect(res.body.data.token.length).toBeGreaterThan(10)

    const cookieHeader = parseSetCookie(res.headers["set-cookie"])
    expect(cookieHeader).toContain(`${CSRF_COOKIE_NAME}=`)
    expect(decodeURIComponent(cookieHeader.split(`${CSRF_COOKIE_NAME}=`)[1] ?? "")).toBe(
      res.body.data.token
    )
  })

  it("rejects staff login without CSRF", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: STAFF_EMAIL, password: WRONG_PASSWORD })

    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe("CSRF_VALIDATION_FAILED")
  })

  it("rejects protected mutating routes when CSRF header is missing", async () => {
    const sessionCookie = await loginSessionCookie()

    const res = await request(app.getHttpServer())
      .patch("/api/v1/auth/me/password")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", sessionCookie)
      .send({
        currentPassword: STAFF_PASSWORD,
        newPassword: "AnotherSecure1!",
      })

    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe("CSRF_VALIDATION_FAILED")
  })

  it("rejects protected mutating routes when CSRF header does not match cookie", async () => {
    const sessionCookie = await loginSessionCookie()

    const csrf = await request(app.getHttpServer())
      .get("/api/v1/csrf")
      .set("Cookie", sessionCookie)

    const csrfCookie = parseSetCookie(csrf.headers["set-cookie"])
    const cookieHeader = [sessionCookie, csrfCookie].filter(Boolean).join("; ")

    const res = await request(app.getHttpServer())
      .patch("/api/v1/auth/me/password")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookieHeader)
      .set(CSRF_HEADER_NAME, "mismatched-csrf-token")
      .send({
        currentPassword: STAFF_PASSWORD,
        newPassword: "AnotherSecure1!",
      })

    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe("CSRF_VALIDATION_FAILED")
  })

  it("accepts protected mutating routes when cookie and header tokens match", async () => {
    const sessionCookie = await loginSessionCookie()

    const csrf = await request(app.getHttpServer())
      .get("/api/v1/csrf")
      .set("Cookie", sessionCookie)

    const csrfToken = csrf.body.data.token as string
    const csrfCookie = parseSetCookie(csrf.headers["set-cookie"])
    const cookieHeader = [sessionCookie, csrfCookie].filter(Boolean).join("; ")

    const res = await request(app.getHttpServer())
      .patch("/api/v1/auth/me/password")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookieHeader)
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({
        currentPassword: STAFF_PASSWORD,
        newPassword: "AnotherSecure1!",
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.changed).toBe(true)
  })
})
