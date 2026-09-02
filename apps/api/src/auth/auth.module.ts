import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { AuthController } from "./auth.controller"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"
import { PermissionGuard } from "./permission.guard"
import { RolesGuard } from "./roles.guard"
import { LoginProtectionService } from "./login-protection.service"
import { RedisSessionCache } from "./redis-session.cache"
import { SESSION_CACHE } from "./session-cache"
import { SessionService } from "./session.service"

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: SESSION_CACHE,
      useClass: RedisSessionCache,
    },
    SessionService,
    LoginProtectionService,
    AuthGuard,
    PermissionGuard,
    RolesGuard,
  ],
  exports: [AuthService, SessionService, AuthGuard, PermissionGuard, RolesGuard],
})
export class AuthModule {}
