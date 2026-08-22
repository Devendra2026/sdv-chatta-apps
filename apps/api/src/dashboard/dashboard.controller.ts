import { Controller, Get, Query, UseGuards } from "@nestjs/common"

import { RequirePermission } from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import { PrismaService } from "../prisma/prisma.service"
import { StorageService } from "../storage/storage.service"

@Controller("api/v1/dashboard")
@UseGuards(AuthGuard, PermissionGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  @Get("summary")
  @RequirePermission("dashboard:read")
  async summary(@Query("wardId") wardId?: string) {
    const surveyWhere = {
      deletedAt: null,
      status: { not: "DELETED" as const },
      ...(wardId ? { wardId } : {}),
    }

    const paymentWhere = {
      ...(wardId ? { wardId } : {}),
    }

    const successPaymentWhere = {
      ...paymentWhere,
      status: "SUCCESS" as const,
    }

    const [
      totalProperties,
      draftSurveys,
      activeSurveys,
      archivedSurveys,
      completeQuality,
      needsReviewQuality,
      totalCollectionAgg,
      onlineCollectionAgg,
      offlineCollectionAgg,
      pendingPayments,
      successPayments,
      failedPayments,
      pendingCollectionAgg,
      byWard,
      paymentsByWard,
      pendingByWard,
      recentAttachments,
      wards,
    ] = await Promise.all([
      this.prisma.survey.count({ where: surveyWhere }),
      this.prisma.survey.count({
        where: { ...surveyWhere, status: "DRAFT" },
      }),
      this.prisma.survey.count({
        where: { ...surveyWhere, status: "ACTIVE" },
      }),
      this.prisma.survey.count({
        where: { ...surveyWhere, status: "ARCHIVED" },
      }),
      this.prisma.survey.count({
        where: { ...surveyWhere, dataQualityStatus: "COMPLETE" },
      }),
      this.prisma.survey.count({
        where: { ...surveyWhere, dataQualityStatus: "NEEDS_REVIEW" },
      }),
      this.prisma.payment.aggregate({
        where: successPaymentWhere,
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...successPaymentWhere, paymentMode: "ONLINE" },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...successPaymentWhere,
          paymentMode: { not: "ONLINE" },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          ...paymentWhere,
          status: { in: ["PENDING", "INITIATED"] },
        },
      }),
      this.prisma.payment.count({
        where: successPaymentWhere,
      }),
      this.prisma.payment.count({
        where: { ...paymentWhere, status: "FAILED" },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...paymentWhere,
          status: { in: ["PENDING", "INITIATED"] },
        },
        _sum: { amount: true },
      }),
      this.prisma.survey.groupBy({
        by: ["wardId"],
        where: surveyWhere,
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ["wardId", "paymentMode"],
        where: { ...successPaymentWhere, wardId: { not: null } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ["wardId"],
        where: {
          ...paymentWhere,
          wardId: { not: null },
          status: { in: ["PENDING", "INITIATED"] },
        },
        _sum: { amount: true },
      }),
      this.prisma.surveyAttachment.findMany({
        where: wardId
          ? { survey: { wardId, deletedAt: null } }
          : { survey: { deletedAt: null } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          survey: {
            select: { id: true, surveyId: true, ownerName: true },
          },
        },
      }),
      this.prisma.ward.findMany({
        where: { isActive: true },
        orderBy: { number: "asc" },
      }),
    ])

    const countByWard = new Map(byWard.map((w) => [w.wardId, w._count._all]))
    const pendingByWardMap = new Map(
      pendingByWard.map((w) => [w.wardId ?? "", Number(w._sum.amount ?? 0)])
    )

    type WardMoney = { online: number; offline: number; total: number }
    const moneyByWard = new Map<string, WardMoney>()
    for (const row of paymentsByWard) {
      if (!row.wardId) continue
      const current = moneyByWard.get(row.wardId) ?? {
        online: 0,
        offline: 0,
        total: 0,
      }
      const amount = Number(row._sum.amount ?? 0)
      if (row.paymentMode === "ONLINE") {
        current.online += amount
      } else {
        current.offline += amount
      }
      current.total += amount
      moneyByWard.set(row.wardId, current)
    }

    const wardsWithSurveys = wards.filter(
      (w) => (countByWard.get(w.id) ?? 0) > 0
    ).length
    const wardsInProgress = wards.filter((w) => {
      const count = countByWard.get(w.id) ?? 0
      return count > 0 && (moneyByWard.get(w.id)?.total ?? 0) === 0
    }).length

    const onlineCollection = Number(onlineCollectionAgg._sum.amount ?? 0)
    const offlineCollection = Number(offlineCollectionAgg._sum.amount ?? 0)
    const totalCollection = Number(totalCollectionAgg._sum.amount ?? 0)
    const pendingCollection = Number(pendingCollectionAgg._sum.amount ?? 0)

    const attachmentsWithUrls = await Promise.all(
      recentAttachments.map(async (a) => {
        let url: string | null = null
        try {
          if (a.mimeType.startsWith("image/")) {
            url = await this.storage.getSignedUrl(a.objectKey, 600)
          }
        } catch {
          url = null
        }
        return {
          id: a.id,
          originalFileName: a.originalFileName,
          mimeType: a.mimeType,
          createdAt: a.createdAt,
          url,
          survey: a.survey,
        }
      })
    )

    const wardBreakdown = wards.map((w) => {
      const surveyCount = countByWard.get(w.id) ?? 0
      const money = moneyByWard.get(w.id) ?? {
        online: 0,
        offline: 0,
        total: 0,
      }
      const pendingCollectionWard = pendingByWardMap.get(w.id) ?? 0
      return {
        wardId: w.id,
        number: w.number,
        code: w.code,
        name: w.name,
        surveyCount,
        onlineCollection: money.online,
        offlineCollection: money.offline,
        pendingCollection: pendingCollectionWard,
        totalCollection: money.total,
        status:
          surveyCount === 0
            ? ("PENDING" as const)
            : money.total > 0
              ? ("COMPLETED" as const)
              : ("IN_PROGRESS" as const),
      }
    })

    return {
      success: true,
      data: {
        totalProperties,
        draftSurveys,
        activeSurveys,
        archivedSurveys,
        completeQuality,
        needsReviewQuality,
        totalWards: wards.length,
        wardsWithSurveys,
        wardsInProgress,
        totalCollection,
        onlineCollection,
        offlineCollection,
        pendingCollection,
        pendingPayments,
        successPayments,
        failedPayments,
        recentAttachments: attachmentsWithUrls,
        wardBreakdown,
      },
    }
  }
}
