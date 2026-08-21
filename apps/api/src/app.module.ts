import { Module } from "@nestjs/common"

import { AuditModule } from "./audit/audit.module"
import { AuthModule } from "./auth/auth.module"
import { DashboardModule } from "./dashboard/dashboard.module"
import { HealthModule } from "./health/health.module"
import { ImportsModule } from "./imports/imports.module"
import { PaymentsModule } from "./payments/payments.module"
import { PrismaModule } from "./prisma/prisma.module"
import { RbacModule } from "./rbac/rbac.module"
import { ReportsModule } from "./reports/reports.module"
import { StorageModule } from "./storage/storage.module"
import { SurveysModule } from "./surveys/surveys.module"
import { WardsModule } from "./wards/wards.module"

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
  ],
})
export class AppModule {}
