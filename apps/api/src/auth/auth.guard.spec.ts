import { UnauthorizedException } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"

import { AuthGuard } from "./auth.guard"

jest.mock("better-auth", () => ({
  betterAuth: () => ({
    api: { getSession: async () => null },
  }),
}))
jest.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: () => ({}),
}))
jest.mock("better-auth/node", () => ({
  fromNodeHeaders: () => ({}),
}))

function httpContext(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  } as ExecutionContext
}

function createGuard(opts: {
  sessionUser?: { id: string } | null
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
  const authService = {
    auth: {
      api: {
        getSession: jest
          .fn()
          .mockResolvedValue(
            opts.sessionUser ? { user: opts.sessionUser } : null
          ),
      },
    },
  }
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(opts.dbUser ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
  }
  return {
    guard: new AuthGuard(authService as never, prisma as never),
    prisma,
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
    const { guard } = createGuard({ sessionUser: null })
    await expect(guard.canActivate(httpContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("rejects a nonexistent user", async () => {
    const { guard } = createGuard({
      sessionUser: { id: "missing" },
      dbUser: null,
    })
    await expect(guard.canActivate(httpContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("rejects an inactive user", async () => {
    const { guard } = createGuard({
      sessionUser: { id: "user-1" },
      dbUser: { ...activeSuperAdmin, status: "INACTIVE" },
    })
    await expect(guard.canActivate(httpContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("allows an active Super Admin", async () => {
    const { guard, prisma } = createGuard({
      sessionUser: { id: "user-1" },
      dbUser: activeSuperAdmin,
    })
    await expect(guard.canActivate(httpContext())).resolves.toBe(true)
    expect(prisma.user.update).toHaveBeenCalled()
  })
})
