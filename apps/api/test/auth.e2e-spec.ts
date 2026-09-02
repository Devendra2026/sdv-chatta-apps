import { INestApplication, ValidationPipe } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AuthGuard } from "../src/auth/auth.guard"
import { AuthModule } from "../src/auth/auth.module"
import { SESSION_CACHE } from "../src/auth/session-cache"
import { CsrfController } from "../src/common/csrf.controller"
import { CsrfGuard } from "../src/common/csrf.guard"
import { AllExceptionsFilter } from "../src/common/all-exceptions.filter"
import { MemorySessionCache } from "./helpers/memory-session.cache"
import { loginWithCsrf, parseSetCookie } from "./helpers/csrf-login"
import { PrismaModule } from "../src/prisma/prisma.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { closeRedisClient } from "../src/common/redis.client"

describe("Nest session auth (e2e)", () => {
  let app: INestApplication<App>
  const sessions = new Map<string, { userId: string; expiresAt: Date }>()
  const users = new Map([
    [
      "staff@example.com",
      {
        id: "user-1",
        email: "staff@example.com",
        name: "Staff",
        phone: null,
        status: "ACTIVE",
        passwordHash:
          "aac8d2567e1e192cf181c8b902cf4129:4bb5d1387efea193bf5a3a1434253bc953cc4c4b1b5a0324477934a5f2a1c079ee3ebab340b950e2b2caca40f133ca9ebfcd75ff40475af657f2f6e71647a760",
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
      update: jest.fn(async () => ({})),
    },
    session: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            tokenHash: string
            userId: string
            expiresAt: Date
            lastActiveAt: Date
            ipAddress?: string | null
            userAgent?: string | null
          }
        }) => {
          sessions.set(data.tokenHash, {
            userId: data.userId,
            expiresAt: data.expiresAt,
          })
          return {
            id: "sess-1",
            tokenHash: data.tokenHash,
            userId: data.userId,
            expiresAt: data.expiresAt,
            lastActiveAt: data.lastActiveAt,
            createdAt: new Date(),
            revokedAt: null,
            ipAddress: data.ipAddress ?? null,
            userAgent: data.userAgent ?? null,
          }
        }
      ),
      findUnique: jest.fn(
        async ({ where }: { where: { tokenHash: string } }) => {
          const row = sessions.get(where.tokenHash)
          if (!row) return null
          return {
            id: "sess-1",
            tokenHash: where.tokenHash,
            userId: row.userId,
            expiresAt: row.expiresAt,
            lastActiveAt: new Date(),
            createdAt: new Date(),
            revokedAt: null,
            ipAddress: null,
            userAgent: null,
          }
        }
      ),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
      deleteMany: jest.fn(async ({ where }: { where: { tokenHash?: string } }) => {
        if (where.tokenHash) sessions.delete(where.tokenHash)
        return { count: 1 }
      }),
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
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule],
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

  afterAll(async () => {
    await app.close()
    await closeRedisClient()
  })

  it("POST /api/v1/auth/register is disabled", async () => {
    const csrf = await request(app.getHttpServer()).get("/api/v1/csrf")
    const token = csrf.body.data.token as string
    const cookie = parseSetCookie(csrf.headers["set-cookie"])

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookie)
      .set("x-csrf-token", token)
      .send({ email: "new@example.com", password: "UnusedPass1!" })

    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe("AUTH_REGISTER_DISABLED")
  })

  it("POST /api/v1/auth/login sets chhata_session and GET /me returns user", async () => {
    const login = await loginWithCsrf(app, "staff@example.com", "test1234")

    expect(login.status).toBe(201)
    const cookie = parseSetCookie(login.headers["set-cookie"])
    expect(cookie).toMatch(/chhata_session=/)

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)

    expect(me.status).toBe(200)
    expect(me.body.success).toBe(true)
    expect(me.body.data.email).toBe("staff@example.com")
    expect(me.body.data.roles).toContain("SUPER_ADMIN")
  })

  it("POST /api/v1/auth/logout clears the session cookie", async () => {
    const login = await loginWithCsrf(app, "staff@example.com", "test1234")
    const cookie = parseSetCookie(login.headers["set-cookie"])

    const csrf = await request(app.getHttpServer()).get("/api/v1/csrf")
    const token = csrf.body.data.token as string
    const csrfCookie = parseSetCookie(csrf.headers["set-cookie"])

    const logout = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [cookie, csrfCookie].join("; "))
      .set("x-csrf-token", token)

    expect(logout.status).toBe(201)
    expect(logout.headers["set-cookie"]?.join(";") ?? "").toMatch(
      /chhata_session=;/
    )
  })
})
