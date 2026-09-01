import { Module } from "@nestjs/common"

import { AuthController } from "./auth.controller"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"
import { PermissionGuard } from "./permission.guard"
import { SessionService } from "./session.service"

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, AuthGuard, PermissionGuard],
  exports: [AuthService, SessionService, AuthGuard, PermissionGuard],
})
export class AuthModule {}
