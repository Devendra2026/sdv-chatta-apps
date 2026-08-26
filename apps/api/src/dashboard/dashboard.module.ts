import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { StorageModule } from "../storage/storage.module"
import { DashboardController } from "./dashboard.controller"
import { DashboardService } from "./dashboard.service"

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
