import { ForbiddenException } from "@nestjs/common"

import type { AuthUser } from "./auth.decorators"

export function hasPermission(
  user: AuthUser,
  code: string | string[]
): boolean {
  if (user.roles.includes("SUPER_ADMIN")) return true
  const needed = Array.isArray(code) ? code : [code]
  return needed.every((c) => user.permissions.includes(c))
}

export function assertPermission(
  user: AuthUser,
  code: string | string[]
): void {
  if (hasPermission(user, code)) return
  const needed = Array.isArray(code) ? code : [code]
  const missing = needed.filter((c) => !user.permissions.includes(c))
  throw new ForbiddenException({
    code: "FORBIDDEN",
    message: `Missing permission: ${missing.join(", ")}`,
  })
}

export function canReadSurveyPii(user: AuthUser): boolean {
  return hasPermission(user, "survey:pii:read")
}
