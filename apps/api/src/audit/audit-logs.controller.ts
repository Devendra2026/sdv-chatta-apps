import { Controller, Get, Query } from "@nestjs/common"

import { RequirePermission } from "../auth/auth.decorators"
import { PrismaService } from "../prisma/prisma.service"

@Controller("api/v1/audit-logs")
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("audit:read")
  async list(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "50",
    @Query("entity") entity?: string,
    @Query("entityId") entityId?: string
  ) {
    const p = Number(page)
    const s = Number(pageSize)
    const where = {
      ...(entity ? { entity } : {}),
      ...(entityId ? { entityId } : {}),
    }
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * s,
        take: s,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
    ])
    return {
      success: true,
      data: items,
      meta: { page: p, pageSize: s, total, totalPages: Math.ceil(total / s) || 1 },
    }
  }
}
