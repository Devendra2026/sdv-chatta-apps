import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { AuthModule } from "../auth/auth.module"
import { TaxConfigsController } from "./tax-configs.controller"
import { TaxConfigsService } from "./tax-configs.service"

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TaxConfigsController],
  providers: [TaxConfigsService],
  exports: [TaxConfigsService],
})
export class TaxConfigsModule {}
