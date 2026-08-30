import { ForbiddenException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { REQUIRE_PERMISSIONS_KEY } from "./auth.decorators"
import { PermissionGuard } from "./permission.guard"

function contextWithUser(user?: { roles: string[]; permissions: string[] }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never
}

describe("PermissionGuard", () => {
  it("allows Super Admin without matching permission codes", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["user:delete"]),
    }
    const guard = new PermissionGuard(reflector as unknown as Reflector)
    expect(
      guard.canActivate(
        contextWithUser({
          roles: ["SUPER_ADMIN"],
          permissions: [],
        })
      )
    ).toBe(true)
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_PERMISSIONS_KEY,
      expect.any(Array)
    )
  })

  it("rejects a user missing the required permission", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["user:delete"]),
    }
    const guard = new PermissionGuard(reflector as unknown as Reflector)
    expect(() =>
      guard.canActivate(
        contextWithUser({
          roles: ["OPERATOR"],
          permissions: ["survey:read"],
        })
      )
    ).toThrow(ForbiddenException)
  })
})
