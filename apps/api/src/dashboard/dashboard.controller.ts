import { Controller, Get, Query } from "@nestjs/common"

import { RequirePermission } from "../auth/auth.decorators"
import { DashboardService } from "./dashboard.service"

@Controller("api/v1/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  @RequirePermission("dashboard:read")
  async summary(@Query("wardId") wardId?: string) {
    return this.dashboard.getSummary(wardId)
  }
}
