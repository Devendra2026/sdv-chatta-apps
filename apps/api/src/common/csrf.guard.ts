import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request } from "express"

import { IS_PUBLIC_KEY, SKIP_CSRF_KEY } from "../auth/auth.decorators"
import {
  CSRF_HEADER_NAME,
  csrfTokensMatch,
  isMutatingMethod,
  readCsrfCookie,
} from "./csrf"

function isStaffAuthMutation(path: string): boolean {
  return (
    path.includes("/auth/login") ||
    path.includes("/auth/logout") ||
    path.includes("/auth/register") ||
    path.includes("/auth/forgot-password") ||
    path.includes("/auth/reset-password")
  )
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skipCsrf) {
      return true
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const request = context.switchToHttp().getRequest<Request>()
    if (!isMutatingMethod(request.method)) {
      return true
    }

    // Public mutating routes skip CSRF except staff auth (login/logout/register).
    if (isPublic && !isStaffAuthMutation(request.path || request.url)) {
      return true
    }

    const cookieToken = readCsrfCookie(request)
    const headerToken = request.headers[CSRF_HEADER_NAME]
    if (
      !cookieToken ||
      typeof headerToken !== "string" ||
      !csrfTokensMatch(cookieToken, headerToken)
    ) {
      throw new ForbiddenException({
        code: "CSRF_VALIDATION_FAILED",
        message: "CSRF token missing or invalid",
      })
    }

    return true
  }
}
