import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"

import { AuditModule } from "./audit/audit.module"
import { AuthGuard } from "./auth/auth.guard"
import { AuthModule } from "./auth/auth.module"
import { PermissionGuard } from "./auth/permission.guard"
import { RolesGuard } from "./auth/roles.guard"
import { CsrfController } from "./common/csrf.controller"
import { CsrfGuard } from "./common/csrf.guard"
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
import { createObserveModule } from "@nestjs/observe"
import type { ObserveOptions } from "@nestjs/observe"

export const { ObserveModule, ObserveInstrument } = createObserveModule()

function observeOptionsFromEnv(): ObserveOptions | undefined {
  const appKey = process.env.OBSERVE_APP_KEY?.trim()
  const appSecret = process.env.OBSERVE_APP_SECRET?.trim()
  if (!appKey || !appSecret) return undefined
  return {
    appKey,
    appSecret,
    serviceId: "api",
  }
}

const observeOptions = observeOptionsFromEnv()

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
    ...(observeOptions ? [ObserveModule.forRoot(observeOptions)] : []),
  ],
  controllers: [CsrfController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
