import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common"
import type { Request } from "express"

export const IS_PUBLIC_KEY = "is_public"
export const SKIP_CSRF_KEY = "skip_csrf"
export const REQUIRE_PERMISSIONS_KEY = "require_permissions"
export const REQUIRE_ROLES_KEY = "require_roles"

/** Skip global AuthGuard (login, health, public APIs, gateway callbacks). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

/** Skip CSRF for server-to-server callbacks (Atom gateway, etc.). */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true)

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions)

/** Optional role gate (AND). Prefer @RequirePermission for security. */
export const Roles = (...roles: string[]) => SetMetadata(REQUIRE_ROLES_KEY, roles)

export type AuthUser = {
  id: string
  email: string
  name: string
  phone?: string | null
  status: string
  permissions: string[]
  roles: string[]
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    return request.user
  }
)
