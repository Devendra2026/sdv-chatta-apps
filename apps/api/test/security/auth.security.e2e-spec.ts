import { INestApplication, ValidationPipe } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AuditModule } from "../../src/audit/audit.module"
import { AuthGuard } from "../../src/auth/auth.guard"
import { AuthModule } from "../../src/auth/auth.module"
import { LoginProtectionService } from "../../src/auth/login-protection.service"
import { hashPassword } from "../../src/auth/password-hash"
import { LOGIN_MAX_FAILURES } from "../../src/auth/session.constants"
import { SessionService } from "../../src/auth/session.service"
import { AllExceptionsFilter } from "../../src/common/all-exceptions.filter"
import { PrismaModule } from "../../src/prisma/prisma.module"
import { PrismaService } from "../../src/prisma/prisma.service"

const STAFF_EMAIL = "staff@example.com"
const STAFF_PASSWORD = "StaffPassword1!"
const LEGACY_SHORT_EMAIL = "legacy@example.com"
/** Existing account password from before the 12-character policy */
const LEGACY_SHORT_PASSWORD = "abc123!@xy"

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

function baseStaffUser(passwordHash: string): StaffUser {
  return {
    id: "user-1",
    email: STAFF_EMAIL,
    name: "Staff",
    phone: null,
    status: "ACTIVE",
    passwordHash,
    userRoles: [
      {
        role: {
          code: "SUPER_ADMIN",
          rolePermissions: [{ permission: { code: "dashboard:read" } }],
        },
      },
    ],
  }
}

describe("Auth security (e2e)", () => {
  let app: INestApplication<App>
  let initialPasswordHash: string

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
          data: { passwordHash?: string; lastLoginAt?: Date }
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
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        for (const [tokenHash, row] of sessions.entries()) {
          if (row.id === where.id) {
            sessions.delete(tokenHash)
            return row
          }
        }
        return null
      }),
      deleteMany: jest.fn(
        async ({
          where,
        }: {
          where: {
            tokenHash?: string
            userId?: string
            id?: string | { not: string }
          }
        }) => {
          let count = 0
          for (const [tokenHash, row] of [...sessions.entries()]) {
            if (where.tokenHash && row.tokenHash !== where.tokenHash) continue
            if (where.userId && row.userId !== where.userId) continue
            if (
              where.id &&
              typeof where.id === "object" &&
              "not" in where.id &&
              row.id === where.id.not
            ) {
              continue
            }
            if (where.id && typeof where.id === "string" && row.id !== where.id)
              continue
            sessions.delete(tokenHash)
            count += 1
          }
          return { count }
        }
      ),
    },
    passwordResetToken: {
      deleteMany: jest.fn(
        async ({
          where,
        }: {
          where: { userId?: string; usedAt?: null; id?: { not: string } }
        }) => {
          let count = 0
          for (const [tokenHash, row] of [...passwordResetTokens.entries()]) {
            if (where.userId && row.userId !== where.userId) continue
            if (where.usedAt === null && row.usedAt !== null) continue
            if (where.id && "not" in where.id && row.id === where.id.not) {
              continue
            }
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
          > & {
            failedAttempts?: number
            usedAt?: Date | null
          }
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
    initialPasswordHash = await hashPassword(STAFF_PASSWORD)
    users.set(STAFF_EMAIL, baseStaffUser(initialPasswordHash))

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, AuthModule],
      providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  beforeEach(async () => {
    sessions.clear()
    passwordResetTokens.clear()
    users.set(STAFF_EMAIL, baseStaffUser(initialPasswordHash))
    await app.get(LoginProtectionService).clearLoginFailures(STAFF_EMAIL)
  })

  afterAll(async () => {
    await app.close()
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

  async function createResetTokenForStaff(): Promise<string> {
    const created = await app
      .get(SessionService)
      .createPasswordResetTokenForUser("user-1")
    expect(created?.rawToken).toBeDefined()
    return created!.rawToken
  }

  it("returns administrator guidance from forgot-password", async () => {
    const forgot = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .set("Origin", "http://localhost:3000")

    expect(forgot.status).toBe(201)
    expect(forgot.body.data.message).toMatch(/administrator/i)
    expect(passwordResetTokens.size).toBe(0)
  })

  it("completes admin-generated reset link and reset-password", async () => {
    const rawToken = await createResetTokenForStaff()
    expect(passwordResetTokens.size).toBe(1)

    const reset = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("Origin", "http://localhost:3000")
      .send({
        token: rawToken,
        newPassword: "NewSecurePass1!",
      })

    expect(reset.status).toBe(201)
    expect(reset.body.data.reset).toBe(true)
    expect(sessions.size).toBe(0)

    const loginOld = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD })

    expect(loginOld.status).toBe(401)

    const loginNew = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: STAFF_EMAIL, password: "NewSecurePass1!" })

    expect(loginNew.status).toBe(201)
    expect(sessionCookieFromLogin(loginNew)).toMatch(/chhata_session=/)
  })

  it("locks out login after repeated failures", async () => {
    jest.useFakeTimers()
    try {
      const loginProtection = app.get(LoginProtectionService)
      for (let attempt = 0; attempt < LOGIN_MAX_FAILURES; attempt += 1) {
        const pending = loginProtection.recordLoginFailure(STAFF_EMAIL)
        await jest.runAllTimersAsync()
        await pending
      }

      await expect(
        loginProtection.assertLoginAllowed(STAFF_EMAIL)
      ).rejects.toMatchObject({
        response: { code: "INVALID_CREDENTIALS" },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:3000")
        .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD })

      expect(res.status).toBe(401)
      expect(res.body.error?.code).toBe("INVALID_CREDENTIALS")
      expect(sessions.size).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })

  it("creates a session on login and lists it via GET /sessions", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD })

    expect(login.status).toBe(201)
    const cookie = sessionCookieFromLogin(login)

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)

    expect(me.status).toBe(200)
    expect(me.body.data.email).toBe(STAFF_EMAIL)

    const listed = await request(app.getHttpServer())
      .get("/api/v1/auth/sessions")
      .set("Cookie", cookie)

    expect(listed.status).toBe(200)
    expect(listed.body.data.sessions).toHaveLength(1)
    expect(listed.body.data.sessions[0].current).toBe(true)
  })

  it("invalidates the session on logout", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD })

    const cookie = sessionCookieFromLogin(login)

    const logout = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookie)

    expect(logout.status).toBe(201)

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)

    expect(me.status).toBe(401)
  })

  it("allows login with an existing password shorter than 12 characters", async () => {
    const legacyHash = await hashPassword(LEGACY_SHORT_PASSWORD)
    users.set(LEGACY_SHORT_EMAIL, {
      ...baseStaffUser(legacyHash),
      id: "user-legacy",
      email: LEGACY_SHORT_EMAIL,
    })

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: LEGACY_SHORT_EMAIL, password: LEGACY_SHORT_PASSWORD })

    expect(login.status).toBe(201)
    expect(sessionCookieFromLogin(login)).toMatch(/chhata_session=/)
  })

  it("rejects change-password when new password is shorter than 12 characters", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD })

    const cookie = sessionCookieFromLogin(login)

    const change = await request(app.getHttpServer())
      .patch("/api/v1/auth/me/password")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookie)
      .send({
        currentPassword: STAFF_PASSWORD,
        newPassword: "short1",
      })

    expect(change.status).toBe(400)
  })

  it("rejects reset-password when new password is shorter than 12 characters", async () => {
    const rawToken = await createResetTokenForStaff()
    const reset = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("Origin", "http://localhost:3000")
      .send({
        token: rawToken,
        newPassword: "short1",
      })

    expect(reset.status).toBe(400)
  })

  it("rejects an invalid reset link token", async () => {
    const reset = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("Origin", "http://localhost:3000")
      .send({
        token: "not-the-reset-token-value",
        newPassword: "AnotherSecure1!",
      })

    expect(reset.status).toBe(400)
    expect(reset.body.error?.code).toBe("PASSWORD_RESET_FAILED")
  })

  it("rejects reuse of a consumed reset token", async () => {
    const rawToken = await createResetTokenForStaff()
    const first = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("Origin", "http://localhost:3000")
      .send({
        token: rawToken,
        newPassword: "NewSecurePass1!",
      })
    expect(first.status).toBe(201)

    const second = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("Origin", "http://localhost:3000")
      .send({
        token: rawToken,
        newPassword: "AnotherSecure1!",
      })
    expect(second.status).toBe(400)
  })
})
