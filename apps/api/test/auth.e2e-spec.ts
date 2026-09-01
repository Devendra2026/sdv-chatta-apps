import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AuthModule } from "../src/auth/auth.module"
import { PrismaModule } from "../src/prisma/prisma.module"
import { PrismaService } from "../src/prisma/prisma.service"

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
          data: { token: string; userId: string; expiresAt: Date }
        }) => {
          sessions.set(data.token, {
            userId: data.userId,
            expiresAt: data.expiresAt,
          })
          return { id: "sess-1", ...data }
        }
      ),
      findUnique: jest.fn(async ({ where }: { where: { token: string } }) => {
        const row = sessions.get(where.token)
        if (!row) return null
        return {
          id: "sess-1",
          token: where.token,
          userId: row.userId,
          expiresAt: row.expiresAt,
        }
      }),
      deleteMany: jest.fn(async ({ where }: { where: { token?: string } }) => {
        if (where.token) sessions.delete(where.token)
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
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true })
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("POST /api/v1/auth/login sets chhata_session and GET /me returns user", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "staff@example.com", password: "test1234" })

    expect(login.status).toBe(201)
    const cookie = login.headers["set-cookie"]?.[0] ?? ""
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
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "staff@example.com", password: "test1234" })

    const cookie = login.headers["set-cookie"]?.[0] ?? ""

    const logout = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookie)

    expect(logout.status).toBe(201)
    expect(logout.headers["set-cookie"]?.[0] ?? "").toMatch(/chhata_session=;/)
  })
})
