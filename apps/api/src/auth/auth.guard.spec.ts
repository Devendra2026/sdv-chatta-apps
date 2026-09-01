import { UnauthorizedException } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { AuthGuard } from "./auth.guard"
import { IS_PUBLIC_KEY } from "./auth.decorators"

function httpContext(cookieHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      }),
      getResponse: () => ({
        append: jest.fn(),
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext
}

function createGuard(opts: {
  isPublic?: boolean
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
  refreshSessionIfNeeded?: jest.Mock
}) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return opts.isPublic ?? false
      return undefined
    }),
  }
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
    refreshSessionIfNeeded:
      opts.refreshSessionIfNeeded ??
      jest.fn().mockResolvedValue(null),
    attachSessionCookie: jest.fn(),
  }
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(opts.dbUser ?? null),
    },
  }
  return {
    guard: new AuthGuard(
      reflector as unknown as Reflector,
      sessionService as never,
      prisma as never
    ),
    prisma,
    sessionService,
    reflector,
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
  it("allows @Public() routes without a session", async () => {
    const { guard } = createGuard({ isPublic: true, session: null })
    await expect(guard.canActivate(httpContext())).resolves.toBe(true)
  })

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

  it("refreshes sliding sessions when TTL is low", async () => {
    const refreshSessionIfNeeded = jest.fn().mockResolvedValue({
      id: "sess-1",
      token: "tok",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    const { guard, sessionService } = createGuard({
      session: { userId: "user-1", token: "tok" },
      dbUser: activeSuperAdmin,
      refreshSessionIfNeeded,
    })

    await guard.canActivate(httpContext("chhata_session=tok"))

    expect(refreshSessionIfNeeded).toHaveBeenCalled()
    expect(sessionService.attachSessionCookie).toHaveBeenCalled()
  })
})
