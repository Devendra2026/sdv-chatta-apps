import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { TaxConfigsModule } from "../tax-configs/tax-configs.module"
import { ReportsController } from "./reports.controller"

@Module({
  imports: [AuthModule, TaxConfigsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
