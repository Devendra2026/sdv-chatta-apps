import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request } from "express"

import {
  AuthUser,
  REQUIRE_PERMISSIONS_KEY,
} from "./auth.decorators"

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    )

    if (!required?.length) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Permission denied",
      })
    }

    if (user.roles.includes("SUPER_ADMIN")) {
      return true
    }

    const missing = required.filter((p) => !user.permissions.includes(p))
    if (missing.length > 0) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: `Missing permission: ${missing.join(", ")}`,
      })
    }

    return true
  }
}
