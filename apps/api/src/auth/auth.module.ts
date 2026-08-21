import { Module } from "@nestjs/common"

import { AuthController } from "./auth.controller"
import { AuthMeController } from "./auth-me.controller"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"
import { PermissionGuard } from "./permission.guard"

@Module({
  controllers: [AuthController, AuthMeController],
  providers: [AuthService, AuthGuard, PermissionGuard],
  exports: [AuthService, AuthGuard, PermissionGuard],
})
export class AuthModule {}
