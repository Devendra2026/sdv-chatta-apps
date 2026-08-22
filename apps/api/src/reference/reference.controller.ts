import { Controller, Get, Query, UseGuards } from "@nestjs/common"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"

@Controller("api/v1/reference-entries")
@UseGuards(AuthGuard, PermissionGuard)
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("categories")
  @RequirePermission("report:read")
  async categories() {
    const rows = await this.prisma.referenceCategory.findMany({
      orderBy: { sortOrder: "asc" },
    })
    return { success: true, data: rows }
  }

  @Get()
  @RequirePermission("report:read")
  async list(
    @Query("category") category?: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE"
  ) {
    const entries = await this.prisma.referenceEntry.findMany({
      where: {
        ...(category ? { category: { code: category } } : {}),
        ...(status ? { status } : { status: "ACTIVE" }),
      },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    })

    return { success: true, data: entries }
  }
}
