import { ForbiddenException } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import type { AuthUser } from "./auth.decorators"
import { REQUIRE_ROLES_KEY } from "./auth.decorators"
import { RolesGuard } from "./roles.guard"

function createRolesGuard(requiredRoles?: string[]) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === REQUIRE_ROLES_KEY) return requiredRoles
      return undefined
    }),
  }
  const guard = new RolesGuard(reflector as unknown as Reflector)
  return { guard, reflector }
}

function contextWithUser(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext
}

const clerkUser: AuthUser = {
  id: "u1",
  email: "clerk@example.com",
  name: "Clerk",
  status: "ACTIVE",
  roles: ["CLERK"],
  permissions: ["survey:read"],
}

describe("RolesGuard", () => {
  it("allows when no roles are required", () => {
    const { guard } = createRolesGuard()
    expect(guard.canActivate(contextWithUser(clerkUser))).toBe(true)
  })

  it("allows when user has required role", () => {
    const { guard } = createRolesGuard(["CLERK"])
    expect(guard.canActivate(contextWithUser(clerkUser))).toBe(true)
  })

  it("allows Super Admin bypass", () => {
    const { guard } = createRolesGuard(["DEPARTMENT_ADMIN"])
    expect(
      guard.canActivate(
        contextWithUser({ ...clerkUser, roles: ["SUPER_ADMIN"] })
      )
    ).toBe(true)
  })

  it("rejects missing role", () => {
    const { guard } = createRolesGuard(["DEPARTMENT_ADMIN"])
    expect(() => guard.canActivate(contextWithUser(clerkUser))).toThrow(
      ForbiddenException
    )
  })
})
