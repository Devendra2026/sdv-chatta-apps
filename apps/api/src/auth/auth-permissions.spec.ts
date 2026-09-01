import { ForbiddenException } from "@nestjs/common"

import {
  assertPermission,
  canReadSurveyPii,
  hasPermission,
} from "./auth-permissions"
import type { AuthUser } from "./auth.decorators"

const user: AuthUser = {
  id: "u1",
  email: "u@example.com",
  name: "User",
  status: "ACTIVE",
  roles: ["CLERK"],
  permissions: ["survey:read", "survey:pii:read"],
}

describe("auth-permissions", () => {
  it("hasPermission checks all codes", () => {
    expect(hasPermission(user, "survey:read")).toBe(true)
    expect(hasPermission(user, ["survey:read", "survey:pii:read"])).toBe(true)
    expect(hasPermission(user, "user:read")).toBe(false)
  })

  it("Super Admin bypasses permission checks", () => {
    expect(
      hasPermission({ ...user, roles: ["SUPER_ADMIN"] }, "user:delete")
    ).toBe(true)
  })

  it("assertPermission throws when missing", () => {
    expect(() => assertPermission(user, "user:read")).toThrow(ForbiddenException)
  })

  it("canReadSurveyPii respects survey:pii:read", () => {
    expect(canReadSurveyPii(user)).toBe(true)
    expect(
      canReadSurveyPii({
        ...user,
        permissions: ["survey:read"],
      })
    ).toBe(false)
  })
})
