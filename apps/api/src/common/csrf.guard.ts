import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request } from "express"

import { IS_PUBLIC_KEY } from "../auth/auth.decorators"
import {
  CSRF_HEADER_NAME,
  csrfTokensMatch,
  isMutatingMethod,
  readCsrfCookie,
} from "./csrf"

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const request = context.switchToHttp().getRequest<Request>()
    if (!isMutatingMethod(request.method)) {
      return true
    }

    // Public mutating routes (login, logout, payment callbacks) skip CSRF.
    if (isPublic) {
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
