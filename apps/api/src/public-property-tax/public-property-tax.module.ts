import { Module } from "@nestjs/common"

import { PaymentsModule } from "../payments/payments.module"
import { PrismaModule } from "../prisma/prisma.module"
import { PublicPropertyTaxController } from "./public-property-tax.controller"
import { PublicPropertyTaxService } from "./public-property-tax.service"

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [PublicPropertyTaxController],
  providers: [PublicPropertyTaxService],
})
export class PublicPropertyTaxModule {}
