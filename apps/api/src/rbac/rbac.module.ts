import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { UsersController } from "../users/users.controller"
import { PermissionsController, RolesController } from "./rbac.controller"

@Module({
  imports: [AuthModule],
  controllers: [UsersController, RolesController, PermissionsController],
})
export class RbacModule {}
