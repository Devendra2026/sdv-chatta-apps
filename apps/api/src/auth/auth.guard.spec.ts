import { UnauthorizedException } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"

import { AuthGuard } from "./auth.guard"

function httpContext(cookieHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      }),
    }),
  } as ExecutionContext
}

function createGuard(opts: {
  session?: { userId: string; token: string } | null
  dbUser?: {
    id: string
    email: string
    name: string
    phone: string | null
    status: string
    userRoles: Array<{
      role: {
        code: string
        rolePermissions: Array<{ permission: { code: string } }>
      }
    }>
  } | null
}) {
  const sessionService = {
    readSessionToken: jest.fn(() => opts.session?.token),
    findValidSession: jest.fn().mockResolvedValue(
      opts.session
        ? {
            id: "sess-1",
            token: opts.session.token,
            userId: opts.session.userId,
            expiresAt: new Date(Date.now() + 60_000),
          }
        : null
    ),
  }
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(opts.dbUser ?? null),
    },
  }
  return {
    guard: new AuthGuard(sessionService as never, prisma as never),
    prisma,
    sessionService,
  }
}

const activeSuperAdmin = {
  id: "user-1",
  email: "admin@example.com",
  name: "Super Admin",
  phone: null,
  status: "ACTIVE",
  userRoles: [
    {
      role: {
        code: "SUPER_ADMIN",
        rolePermissions: [{ permission: { code: "user:read" } }],
      },
    },
  ],
}

describe("AuthGuard", () => {
  it("rejects a missing session", async () => {
    const { guard } = createGuard({ session: null })
    await expect(guard.canActivate(httpContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("rejects a nonexistent user", async () => {
    const { guard } = createGuard({
      session: { userId: "missing", token: "tok" },
      dbUser: null,
    })
    await expect(
      guard.canActivate(httpContext("chhata_session=tok"))
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it("rejects an inactive user", async () => {
    const { guard } = createGuard({
      session: { userId: "user-1", token: "tok" },
      dbUser: { ...activeSuperAdmin, status: "INACTIVE" },
    })
    await expect(
      guard.canActivate(httpContext("chhata_session=tok"))
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it("rejects a user without a staff role", async () => {
    const { guard } = createGuard({
      session: { userId: "user-1", token: "tok" },
      dbUser: {
        ...activeSuperAdmin,
        userRoles: [
          {
            role: {
              code: "CUSTOM_ROLE",
              rolePermissions: [],
            },
          },
        ],
      },
    })
    await expect(
      guard.canActivate(httpContext("chhata_session=tok"))
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it("allows an active Super Admin", async () => {
    const { guard } = createGuard({
      session: { userId: "user-1", token: "tok" },
      dbUser: activeSuperAdmin,
    })
    await expect(
      guard.canActivate(httpContext("chhata_session=tok"))
    ).resolves.toBe(true)
  })
})
