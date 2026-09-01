import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { AuthModule } from "../auth/auth.module"
import { UsersController } from "../users/users.controller"
import { UsersService } from "../users/users.service"
import { PermissionsController, RolesController } from "./rbac.controller"
import { RbacService } from "./rbac.service"

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [UsersService, RbacService],
})
export class RbacModule {}
