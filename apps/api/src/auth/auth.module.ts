import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"

import { AuthMeController } from "./auth-me.controller"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"
import { BetterAuthMiddleware } from "./better-auth.middleware"
import { PermissionGuard } from "./permission.guard"

@Module({
  controllers: [AuthMeController],
  providers: [AuthService, AuthGuard, PermissionGuard, BetterAuthMiddleware],
  exports: [AuthService, AuthGuard, PermissionGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BetterAuthMiddleware).forRoutes("{*splat}")
  }
}
