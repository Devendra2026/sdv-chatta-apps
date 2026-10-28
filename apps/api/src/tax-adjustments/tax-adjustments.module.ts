import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { TaxAdjustmentsController } from "./tax-adjustments.controller"
import { TaxAdjustmentsService } from "./tax-adjustments.service"

@Module({
  imports: [AuthModule],
  controllers: [TaxAdjustmentsController],
  providers: [TaxAdjustmentsService],
  exports: [TaxAdjustmentsService],
})
export class TaxAdjustmentsModule {}
