import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { StorageModule } from "../storage/storage.module"
import { DashboardController } from "./dashboard.controller"

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
