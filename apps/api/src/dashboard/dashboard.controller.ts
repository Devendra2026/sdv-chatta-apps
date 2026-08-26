import { Controller, Get, Query, UseGuards } from "@nestjs/common"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { DashboardService } from "./dashboard.service"

@Controller("api/v1/dashboard")
@UseGuards(AuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  @RequirePermission("dashboard:read")
  async summary(@Query("wardId") wardId?: string) {
    return this.dashboard.getSummary(wardId)
  }
}
