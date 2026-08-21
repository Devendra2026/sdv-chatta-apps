import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common"
import type { Response } from "express"
import ExcelJS from "exceljs"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"

@Controller("api/v1/reports")
@UseGuards(AuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("surveys")
  @RequirePermission("report:read")
  async surveyReport(
    @Query("wardId") wardId?: string,
    @Query("propertyUse") propertyUse?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    const where = {
      deletedAt: null,
      status: { not: "DELETED" as const },
      ...(wardId ? { wardId } : {}),
      ...(propertyUse ? { propertyUse } : {}),
      ...(from || to
        ? {
            surveyedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    const [total, byWard, byUse] = await Promise.all([
      this.prisma.survey.count({ where }),
      this.prisma.survey.groupBy({
        by: ["wardId"],
        where,
        _count: { _all: true },
      }),
      this.prisma.survey.groupBy({
        by: ["propertyUse"],
        where,
        _count: { _all: true },
      }),
    ])

    return {
      success: true,
      data: {
        total,
        byWard,
        byUse,
      },
    }
  }

  @Get("payments")
  @RequirePermission("report:read")
  async paymentReport(
    @Query("wardId") wardId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    const where = {
      ...(wardId ? { wardId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    const [byStatus, byMode, sumSuccess] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ["paymentMode"],
        where,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: "SUCCESS" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ])

    return {
      success: true,
      data: {
        byStatus,
        byMode,
        successTotal: Number(sumSuccess._sum.amount ?? 0),
        successCount: sumSuccess._count._all,
      },
    }
  }

  @Get("surveys/export")
  @RequirePermission("report:export")
  async exportSurveys(
    @Res() res: Response,
    @Query("wardId") wardId?: string
  ) {
    const surveys = await this.prisma.survey.findMany({
      where: {
        deletedAt: null,
        status: { not: "DELETED" },
        ...(wardId ? { wardId } : {}),
      },
      include: { ward: true },
      take: 20000,
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Survey Report")
    sheet.addRow(["Survey ID", "Ward", "Owner", "Mobile", "Parcel", "Property Use", "Status"])
    for (const s of surveys) {
      sheet.addRow([
        s.surveyId,
        s.ward.name,
        s.ownerName,
        s.mobile,
        s.parcelNo,
        s.propertyUse,
        s.status,
      ])
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader("Content-Disposition", "attachment; filename=survey-report.xlsx")
    await workbook.xlsx.write(res)
    res.end()
  }
}
