import { Controller, Get, Query, Res } from "@nestjs/common"
import type { Response } from "express"

import { RequirePermission } from "../auth/auth.decorators"
import {
  buildSurveyExportFilename,
  buildSurveyExportWorkbook,
  detectExportPreset,
  type SurveyExportRecord,
} from "../imports/survey-excel-export"
import { PrismaService } from "../prisma/prisma.service"
import { TaxConfigsService } from "../tax-configs/tax-configs.service"
import {
  buildWardTaxReportWorkbook,
  taxConfigToRateTable,
} from "./ward-tax-report-excel"

const EXPORT_ROW_LIMIT = 50_000

@Controller("api/v1/reports")
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxConfigs: TaxConfigsService
  ) {}

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
    @Query("wardId") wardId?: string,
    @Query("assessmentYearId") assessmentYearId?: string,
    @Query("propertyUse") propertyUse?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("template") template?: string
  ) {
    const ward = wardId
      ? await this.prisma.ward.findUnique({ where: { id: wardId } })
      : null

    const surveys = await this.prisma.survey.findMany({
      where: {
        deletedAt: null,
        status: { not: "DELETED" },
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
      },
      include: {
        ward: true,
        floors: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [
        { ward: { number: "asc" } },
        { parcelNo: "asc" },
        { surveyId: "asc" },
      ],
      take: EXPORT_ROW_LIMIT,
    })

    if (template === "import") {
      const preset = detectExportPreset(ward?.number)
      const workbook = buildSurveyExportWorkbook(
        surveys as SurveyExportRecord[],
        preset
      )
      const filename = buildSurveyExportFilename({ wardNumber: ward?.number })
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
      await workbook.xlsx.write(res)
      res.end()
      return
    }

    if (!wardId || !assessmentYearId) {
      res.status(400).json({
        success: false,
        message:
          "wardId and assessmentYearId are required for tax demand export. Use template=import for import-mirror layout.",
      })
      return
    }

    const taxConfig = await this.taxConfigs.getPublishedForWard(
      wardId,
      assessmentYearId
    )
    const rates = taxConfigToRateTable(taxConfig)
    const workbook = buildWardTaxReportWorkbook({
      wardName: ward?.name ?? `Ward ${ward?.number ?? ""}`,
      surveys,
      rates,
    })
    const filename = `ward-tax-report-${ward?.number ?? "all"}.xlsx`

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    await workbook.xlsx.write(res)
    res.end()
  }
}
