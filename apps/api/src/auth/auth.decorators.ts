import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common"
import type { Request } from "express"

export const REQUIRE_PERMISSIONS_KEY = "require_permissions"

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions)

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
