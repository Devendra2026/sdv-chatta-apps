import { Module } from "@nestjs/common"

import { AuditModule } from "./audit/audit.module"
import { AuthModule } from "./auth/auth.module"
import { DashboardModule } from "./dashboard/dashboard.module"
import { HealthModule } from "./health/health.module"
import { ImportsModule } from "./imports/imports.module"
import { PaymentsModule } from "./payments/payments.module"
import { PrismaModule } from "./prisma/prisma.module"
import { PublicPropertyTaxModule } from "./public-property-tax/public-property-tax.module"
import { RbacModule } from "./rbac/rbac.module"
import { ReferenceModule } from "./reference/reference.module"
import { ReportsModule } from "./reports/reports.module"
import { StorageModule } from "./storage/storage.module"
import { SurveysModule } from "./surveys/surveys.module"
import { TaxConfigsModule } from "./tax-configs/tax-configs.module"
import { WardsModule } from "./wards/wards.module"
import { createObserveModule } from "@nestjs/observe";

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    StorageModule,
    HealthModule,
    AuthModule,
    WardsModule,
    SurveysModule,
    DashboardModule,
    ImportsModule,
    RbacModule,
    PaymentsModule,
    ReportsModule,
    TaxConfigsModule,
    ReferenceModule,
    PublicPropertyTaxModule,
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY,
      appSecret: process.env.OBSERVE_APP_SECRET,
      serviceId: "api",
    }),
  ],
})
export class AppModule {}
