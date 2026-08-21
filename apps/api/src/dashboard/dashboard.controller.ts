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

    const [
      totalProperties,
      totalCollectionAgg,
      pendingPayments,
      successPayments,
      failedPayments,
      byWard,
      recentAttachments,
    ] = await Promise.all([
      this.prisma.survey.count({ where: surveyWhere }),
      this.prisma.payment.aggregate({
        where: { ...paymentWhere, status: "SUCCESS" },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { ...paymentWhere, status: { in: ["PENDING", "INITIATED"] } },
      }),
      this.prisma.payment.count({
        where: { ...paymentWhere, status: "SUCCESS" },
      }),
      this.prisma.payment.count({
        where: { ...paymentWhere, status: "FAILED" },
      }),
      this.prisma.survey.groupBy({
        by: ["wardId"],
        where: surveyWhere,
        _count: { _all: true },
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
    ])

    const wards = await this.prisma.ward.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
    })
    const countByWard = new Map(byWard.map((w) => [w.wardId, w._count._all]))

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

    return {
      success: true,
      data: {
        totalProperties,
        totalCollection: Number(totalCollectionAgg._sum.amount ?? 0),
        pendingPayments,
        successPayments,
        failedPayments,
        recentAttachments: attachmentsWithUrls,
        wardBreakdown: wards.map((w) => ({
          wardId: w.id,
          number: w.number,
          code: w.code,
          name: w.name,
          surveyCount: countByWard.get(w.id) ?? 0,
        })),
      },
    }
  }
}
