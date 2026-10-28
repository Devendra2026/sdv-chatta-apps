import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import {
  computePublicDuesPayload,
  type TaxConfigForDues,
} from "../public-property-tax/dues.util"
import {
  computePropertyAssessment,
  type TaxAdjustmentRuleInput,
} from "../tax/tax-calc"
import type { PublishDemandDto } from "./dto/demand.dto"

function toNumber(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value)
}

@Injectable()
export class DemandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private readonly include = {
    assessmentYear: true,
    survey: {
      select: {
        id: true,
        surveyId: true,
        ownerName: true,
        wardId: true,
      },
    },
    demandArrears: true,
  } as const

  private readonly surveyForDemandSelect = {
    id: true,
    surveyId: true,
    ownerName: true,
    mobile: true,
    propertyNo: true,
    parcelNo: true,
    houseNo: true,
    streetName: true,
    locality: true,
    colony: true,
    city: true,
    pincode: true,
    propertyUse: true,
    taxRateZone: true,
    roadType: true,
    hasMunicipalWaterSupply: true,
    plotAreaSqFt: true,
    plinthAreaSqFt: true,
    totalBuiltUpAreaSqFt: true,
    wardId: true,
    ward: { select: { id: true, number: true, name: true } },
    floors: {
      orderBy: { sortOrder: "asc" as const },
      select: {
        floorLabel: true,
        usageType: true,
        usageFactor: true,
        buildingType: true,
        areaSqFt: true,
      },
    },
  } as const

  private readonly taxConfigForDemandInclude = {
    assessmentYear: { select: { id: true, code: true, name: true } },
    cells: {
      include: {
        roadWidthEntry: { select: { code: true } },
        constructionEntry: { select: { code: true } },
      },
    },
  } as const

  async getBySurveyAndYear(surveyId: string, assessmentYearId: string) {
    const demand = await this.prisma.propertyDemand.findUnique({
      where: {
        surveyId_assessmentYearId: { surveyId, assessmentYearId },
      },
      include: this.include,
    })
    if (!demand) throw new NotFoundException("Property demand not found")
    return demand
  }

  async publish(dto: PublishDemandDto, actorId?: string) {
    const survey = await this.prisma.survey.findFirst({
      where: {
        id: dto.surveyId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: this.surveyForDemandSelect,
    })
    if (!survey) throw new NotFoundException("Survey not found")

    await this.assertAssessmentYear(dto.assessmentYearId)

    const taxConfig = await this.loadPublishedTaxConfigForDues(
      survey.wardId,
      dto.assessmentYearId
    )
    const rules = await this.loadPublishedRules(dto.assessmentYearId)
    const demand = await this.upsertPublishedDemandForSurvey({
      survey,
      assessmentYearId: dto.assessmentYearId,
      taxConfig,
      rules,
      preserveArrears: false,
      actorId,
    })

    await this.audit.log({
      action: "PUBLISH",
      entity: "PropertyDemand",
      entityId: demand.id,
      newValue: {
        surveyId: survey.id,
        assessmentYearId: dto.assessmentYearId,
        totalPayable: toNumber(demand.totalPayable),
        verified: demand.verified,
      },
      actorId,
    })

    return demand
  }

  /**
   * Publish PropertyDemand rows for every active survey in a ward/year.
   * Loads the published TaxConfig once and pages surveys in batches.
   * Existing demand arrears are preserved; new rows start at arrears 0.
   */
  async publishForWard(
    wardId: string,
    assessmentYearId: string,
    actorId?: string
  ): Promise<{ created: number; updated: number; total: number }> {
    const ward = await this.prisma.ward.findUnique({
      where: { id: wardId },
      select: { id: true },
    })
    if (!ward) throw new NotFoundException("Ward not found")

    await this.assertAssessmentYear(assessmentYearId)

    const taxConfig = await this.loadPublishedTaxConfigForDues(
      wardId,
      assessmentYearId
    )
    const rules = await this.loadPublishedRules(assessmentYearId)

    const batchSize = 100
    let created = 0
    let updated = 0
    let cursor: string | undefined

    for (;;) {
      const surveys = await this.prisma.survey.findMany({
        where: {
          wardId,
          status: "ACTIVE",
          deletedAt: null,
        },
        select: this.surveyForDemandSelect,
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      })
      if (surveys.length === 0) break

      for (const survey of surveys) {
        const existing = await this.prisma.propertyDemand.findUnique({
          where: {
            surveyId_assessmentYearId: {
              surveyId: survey.id,
              assessmentYearId,
            },
          },
          select: { id: true },
        })
        await this.upsertPublishedDemandForSurvey({
          survey,
          assessmentYearId,
          taxConfig,
          rules,
          preserveArrears: true,
          actorId,
        })
        if (existing) updated += 1
        else created += 1
      }

      cursor = surveys[surveys.length - 1]?.id
      if (surveys.length < batchSize) break
    }

    const total = created + updated
    await this.audit.log({
      action: "PUBLISH_WARD",
      entity: "PropertyDemand",
      entityId: `${wardId}:${assessmentYearId}`,
      newValue: {
        wardId,
        assessmentYearId,
        created,
        updated,
        total,
        taxConfigId: taxConfig.id,
        taxConfigVersion: taxConfig.version,
      },
      actorId,
    })

    return { created, updated, total }
  }

  private async assertAssessmentYear(assessmentYearId: string) {
    const year = await this.prisma.referenceEntry.findUnique({
      where: { id: assessmentYearId },
      include: { category: true },
    })
    if (!year || year.category.code !== "ASSESSMENT_YEAR") {
      throw new BadRequestException("Invalid assessment year")
    }
  }

  private async loadPublishedTaxConfigForDues(
    wardId: string,
    assessmentYearId: string
  ): Promise<TaxConfigForDues> {
    const taxConfig = await this.prisma.taxConfig.findUnique({
      where: {
        wardId_assessmentYearId: { wardId, assessmentYearId },
      },
      include: this.taxConfigForDemandInclude,
    })
    if (!taxConfig || taxConfig.status !== "PUBLISHED") {
      throw new ConflictException(
        "No published tax configuration for this ward and assessment year"
      )
    }
    return {
      id: taxConfig.id,
      version: taxConfig.version,
      assessablePct: taxConfig.assessablePct,
      commercialAssessablePct: taxConfig.commercialAssessablePct,
      propertyTaxPct: taxConfig.propertyTaxPct,
      waterTaxPct: taxConfig.waterTaxPct,
      drainageTaxPct: taxConfig.drainageTaxPct,
      penaltyPct: taxConfig.penaltyPct,
      assessmentYear: taxConfig.assessmentYear,
      cells: taxConfig.cells,
      updatedAt: taxConfig.updatedAt,
    }
  }

  private async upsertPublishedDemandForSurvey(input: {
    survey: {
      id: string
      surveyId: string
      ownerName: string | null
      mobile: string | null
      propertyNo: string | null
      parcelNo: string | null
      houseNo: string | null
      streetName: string | null
      locality: string | null
      colony: string | null
      city: string | null
      pincode: string | null
      propertyUse: string | null
      taxRateZone: string | null
      roadType: string | null
      hasMunicipalWaterSupply: boolean | null
      plotAreaSqFt: { toString(): string } | number | null
      plinthAreaSqFt: { toString(): string } | number | null
      totalBuiltUpAreaSqFt: { toString(): string } | number | null
      wardId: string
      ward: { id: string; number: number; name: string }
      floors: Array<{
        floorLabel: string
        usageType: string | null
        usageFactor: string | null
        buildingType: string | null
        areaSqFt: { toString(): string } | number | null
      }>
    }
    assessmentYearId: string
    taxConfig: TaxConfigForDues
    rules: TaxAdjustmentRuleInput[]
    preserveArrears: boolean
    actorId?: string
  }) {
    const {
      survey,
      assessmentYearId,
      taxConfig,
      rules,
      preserveArrears,
      actorId,
    } = input

    const existing = await this.prisma.propertyDemand.findUnique({
      where: {
        surveyId_assessmentYearId: {
          surveyId: survey.id,
          assessmentYearId,
        },
      },
    })

    const dues = computePublicDuesPayload(survey, taxConfig)
    const amountPaid = await this.sumSuccessPayments(
      survey.id,
      assessmentYearId
    )
    const arrears = preserveArrears
      ? existing
        ? toNumber(existing.arrears)
        : 0
      : 0
    const assessment = computePropertyAssessment({
      base: {
        propertyTax: dues.tax.propertyTax,
        waterTax: dues.tax.waterTax,
        drainageTax: dues.tax.drainageTax,
        penalty: dues.tax.penalty,
        totalDemand: dues.tax.totalDemand,
      },
      rules,
      arrears,
      amountPaid,
    })

    const priorYearIssue = await this.hasPriorYearPaymentsWithoutDemand(
      survey.id,
      assessmentYearId
    )
    const verified =
      !(amountPaid > assessment.totalPayable) && !priorYearIssue

    const snapshot: Prisma.InputJsonValue = {
      taxConfigId: taxConfig.id,
      taxConfigVersion: taxConfig.version,
      dues: dues.tax,
      rules,
      assessment,
      priorYearIssue,
    }

    const data = {
      status: "PUBLISHED" as const,
      propertyTax: assessment.propertyTax,
      waterTax: assessment.waterTax,
      drainageTax: assessment.drainageTax,
      penalty: assessment.penalty,
      rebate: assessment.rebate,
      arrears: assessment.arrears,
      currentDemand: assessment.currentDemand,
      totalPayable: assessment.totalPayable,
      amountPaid: assessment.amountPaid,
      outstanding: assessment.outstanding,
      verified,
      snapshot,
      publishedAt: new Date(),
      publishedById: actorId,
    }

    if (existing) {
      return this.prisma.propertyDemand.update({
        where: { id: existing.id },
        data,
        include: this.include,
      })
    }

    return this.prisma.propertyDemand.create({
      data: {
        surveyId: survey.id,
        assessmentYearId,
        ...data,
      },
      include: this.include,
    })
  }

  private async loadPublishedRules(
    assessmentYearId: string
  ): Promise<TaxAdjustmentRuleInput[]> {
    const now = new Date()
    const rows = await this.prisma.taxAdjustmentRule.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ assessmentYearId: null }, { assessmentYearId }],
      },
    })

    return rows
      .filter((r) => {
        if (r.effectiveFrom && r.effectiveFrom > now) return false
        if (r.effectiveTo && r.effectiveTo < now) return false
        return true
      })
      .map((r) => ({
        kind: r.kind,
        head: r.head,
        method: r.method,
        value: toNumber(r.value),
        cap: r.cap == null ? null : toNumber(r.cap),
      }))
  }

  private async sumSuccessPayments(
    surveyId: string,
    assessmentYearId: string
  ): Promise<number> {
    const agg = await this.prisma.payment.aggregate({
      where: {
        surveyId,
        assessmentYearId,
        status: "SUCCESS",
      },
      _sum: { amount: true },
    })
    return toNumber(agg._sum.amount ?? 0)
  }

  /**
   * Flag when SUCCESS payments exist for other years that have no PropertyDemand.
   */
  private async hasPriorYearPaymentsWithoutDemand(
    surveyId: string,
    currentYearId: string
  ): Promise<boolean> {
    const payments = await this.prisma.payment.findMany({
      where: {
        surveyId,
        status: "SUCCESS",
        assessmentYearId: { not: null },
        NOT: { assessmentYearId: currentYearId },
      },
      select: { assessmentYearId: true },
      distinct: ["assessmentYearId"],
    })

    for (const p of payments) {
      if (!p.assessmentYearId) continue
      const demand = await this.prisma.propertyDemand.findUnique({
        where: {
          surveyId_assessmentYearId: {
            surveyId,
            assessmentYearId: p.assessmentYearId,
          },
        },
        select: { id: true },
      })
      if (!demand) return true
    }
    return false
  }

  async getPublishedForSurvey(
    surveyId: string,
    assessmentYearId?: string
  ) {
    const include = {
      assessmentYear: { select: { id: true, code: true, name: true } },
      survey: {
        select: {
          id: true,
          surveyId: true,
          ownerName: true,
          wardId: true,
        },
      },
      demandArrears: {
        include: {
          sourceAssessmentYear: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    } as const

    const demand = assessmentYearId
      ? await this.prisma.propertyDemand.findUnique({
          where: {
            surveyId_assessmentYearId: { surveyId, assessmentYearId },
          },
          include,
        })
      : await this.prisma.propertyDemand.findFirst({
          where: { surveyId, status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          include,
        })

    return demand ? this.serializeDemand(demand) : null
  }

  async listDemands(query: {
    page?: number
    pageSize?: number
    wardId?: string
    assessmentYearId?: string
    surveyId?: string
    search?: string
    status?: string
    outstandingOnly?: boolean
  }) {
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? 20, 100)
    const search = query.search?.trim()

    const where: Prisma.PropertyDemandWhereInput = {
      ...(query.assessmentYearId
        ? { assessmentYearId: query.assessmentYearId }
        : {}),
      ...(query.surveyId ? { surveyId: query.surveyId } : {}),
      ...(query.status === "DRAFT" ||
      query.status === "PUBLISHED" ||
      query.status === "CLOSED"
        ? { status: query.status }
        : {}),
      ...(query.outstandingOnly ? { outstanding: { gt: 0 } } : {}),
      ...(query.wardId || search
        ? {
            survey: {
              ...(query.wardId ? { wardId: query.wardId } : {}),
              ...(search
                ? {
                    OR: [
                      { surveyId: { contains: search, mode: "insensitive" } },
                      { ownerName: { contains: search, mode: "insensitive" } },
                      { propertyNo: { contains: search, mode: "insensitive" } },
                      { parcelNo: { contains: search, mode: "insensitive" } },
                      { houseNo: { contains: search, mode: "insensitive" } },
                    ],
                  }
                : {}),
            },
          }
        : {}),
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.propertyDemand.count({ where }),
      this.prisma.propertyDemand.findMany({
        where,
        orderBy: [{ outstanding: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assessmentYear: { select: { id: true, code: true, name: true } },
          survey: {
            select: {
              id: true,
              surveyId: true,
              ownerName: true,
              propertyNo: true,
              parcelNo: true,
              houseNo: true,
              wardId: true,
              ward: { select: { id: true, number: true, name: true } },
            },
          },
          demandArrears: {
            include: {
              sourceAssessmentYear: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      }),
    ])

    return {
      items: items.map((d) => this.serializeDemand(d)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    }
  }

  async getCustomerLedger(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        surveyId: true,
        ownerName: true,
        ownerFatherName: true,
        mobile: true,
        propertyNo: true,
        parcelNo: true,
        houseNo: true,
        ward: { select: { id: true, number: true, name: true } },
      },
    })
    if (!survey) throw new NotFoundException("Survey not found")

    const demands = await this.prisma.propertyDemand.findMany({
      where: { surveyId },
      orderBy: { createdAt: "asc" },
      include: {
        assessmentYear: { select: { id: true, code: true, name: true } },
        demandArrears: {
          include: {
            sourceAssessmentYear: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    })

    const payments = await this.prisma.payment.findMany({
      where: { surveyId, status: "SUCCESS" },
      orderBy: { collectionDate: "asc" },
      select: {
        id: true,
        paymentReference: true,
        receiptNumber: true,
        amount: true,
        paymentMode: true,
        collectionDate: true,
        createdAt: true,
        assessmentYearId: true,
        propertyDemandId: true,
        assessmentYear: { select: { id: true, code: true, name: true } },
      },
    })

    return {
      survey,
      demands: demands.map((d) => this.serializeDemand(d)),
      payments: payments.map((p) => ({
        id: p.id,
        paymentReference: p.paymentReference,
        receiptNumber: p.receiptNumber,
        amount: toNumber(p.amount),
        paymentMode: p.paymentMode,
        channel: p.paymentMode === "ONLINE" ? "ONLINE" : "OFFLINE",
        collectionDate: (p.collectionDate ?? p.createdAt).toISOString(),
        assessmentYearId: p.assessmentYearId,
        assessmentYear: p.assessmentYear,
        propertyDemandId: p.propertyDemandId,
      })),
    }
  }

  async previewYearEnd(fromYearId: string, toYearId: string) {
    await this.assertDistinctAssessmentYears(fromYearId, toYearId)

    const unpaid = await this.prisma.propertyDemand.findMany({
      where: {
        assessmentYearId: fromYearId,
        status: "PUBLISHED",
        outstanding: { gt: 0 },
      },
      include: {
        survey: {
          select: {
            id: true,
            surveyId: true,
            ownerName: true,
            ward: { select: { number: true, name: true } },
          },
        },
        assessmentYear: { select: { id: true, code: true, name: true } },
      },
      orderBy: { outstanding: "desc" },
      take: 5000,
    })

    const proposedArrears = unpaid.map((d) => ({
      surveyId: d.surveyId,
      municipalSurveyId: d.survey.surveyId,
      ownerName: d.survey.ownerName,
      ward: d.survey.ward,
      fromOutstanding: toNumber(d.outstanding),
      sourceAssessmentYearId: fromYearId,
      targetAssessmentYearId: toYearId,
    }))

    const totalArrears = proposedArrears.reduce(
      (s, r) => s + r.fromOutstanding,
      0
    )

    const existingRun = await this.prisma.yearEndRun.findUnique({
      where: {
        fromAssessmentYearId_toAssessmentYearId: {
          fromAssessmentYearId: fromYearId,
          toAssessmentYearId: toYearId,
        },
      },
    })

    return {
      fromYearId,
      toYearId,
      count: proposedArrears.length,
      totalArrears: Math.round(totalArrears * 100) / 100,
      alreadyCommitted: existingRun?.status === "COMMITTED",
      proposedArrears,
    }
  }

  async commitYearEnd(
    fromYearId: string,
    toYearId: string,
    actorId?: string
  ) {
    await this.assertDistinctAssessmentYears(fromYearId, toYearId)

    const existingRun = await this.prisma.yearEndRun.findUnique({
      where: {
        fromAssessmentYearId_toAssessmentYearId: {
          fromAssessmentYearId: fromYearId,
          toAssessmentYearId: toYearId,
        },
      },
    })
    if (existingRun?.status === "COMMITTED") {
      return {
        noop: true,
        run: existingRun,
        summary: existingRun.summary,
      }
    }

    const preview = await this.previewYearEnd(fromYearId, toYearId)

    const result = await this.prisma.$transaction(async (tx) => {
      let carried = 0
      let skipped = 0

      for (const row of preview.proposedArrears) {
        let target = await tx.propertyDemand.findUnique({
          where: {
            surveyId_assessmentYearId: {
              surveyId: row.surveyId,
              assessmentYearId: toYearId,
            },
          },
          include: { demandArrears: true },
        })

        if (!target) {
          target = await tx.propertyDemand.create({
            data: {
              surveyId: row.surveyId,
              assessmentYearId: toYearId,
              status: "DRAFT",
              arrears: row.fromOutstanding,
              totalPayable: row.fromOutstanding,
              outstanding: row.fromOutstanding,
              amountPaid: 0,
              currentDemand: 0,
              verified: true,
            },
            include: { demandArrears: true },
          })
        }

        const already = target.demandArrears.some(
          (a) => a.sourceAssessmentYearId === fromYearId
        )
        if (already) {
          skipped += 1
          continue
        }

        await tx.demandArrear.create({
          data: {
            demandId: target.id,
            sourceAssessmentYearId: fromYearId,
            amount: row.fromOutstanding,
          },
        })

        const arrearsSum =
          target.demandArrears.reduce((s, a) => s + toNumber(a.amount), 0) +
          row.fromOutstanding
        const currentDemand = toNumber(target.currentDemand)
        const amountPaid = toNumber(target.amountPaid)
        const totalPayable = Math.round((currentDemand + arrearsSum) * 100) / 100
        const outstanding =
          Math.round(Math.max(0, totalPayable - amountPaid) * 100) / 100

        await tx.propertyDemand.update({
          where: { id: target.id },
          data: {
            arrears: arrearsSum,
            totalPayable,
            outstanding,
          },
        })
        carried += 1
      }

      const summary: Prisma.InputJsonValue = {
        count: preview.count,
        totalArrears: preview.totalArrears,
        carried,
        skipped,
      }

      const run = existingRun
        ? await tx.yearEndRun.update({
            where: { id: existingRun.id },
            data: {
              status: "COMMITTED",
              summary,
              committedAt: new Date(),
              createdById: actorId,
            },
          })
        : await tx.yearEndRun.create({
            data: {
              fromAssessmentYearId: fromYearId,
              toAssessmentYearId: toYearId,
              status: "COMMITTED",
              summary,
              committedAt: new Date(),
              createdById: actorId,
            },
          })

      return { run, summary, carried, skipped }
    })

    await this.audit.log({
      action: "YEAR_END_COMMIT",
      entity: "YearEndRun",
      entityId: result.run.id,
      actorId,
      newValue: result.summary as Prisma.InputJsonValue,
    })

    return {
      noop: false,
      run: result.run,
      summary: result.summary,
      carried: result.carried,
      skipped: result.skipped,
    }
  }

  private async assertDistinctAssessmentYears(
    fromYearId: string,
    toYearId: string
  ) {
    if (fromYearId === toYearId) {
      throw new BadRequestException(
        "fromYearId and toYearId must be different assessment years"
      )
    }
    const years = await this.prisma.referenceEntry.findMany({
      where: { id: { in: [fromYearId, toYearId] } },
      include: { category: true },
    })
    if (years.length !== 2) {
      throw new BadRequestException("Invalid assessment year id")
    }
    for (const y of years) {
      if (y.category.code !== "ASSESSMENT_YEAR") {
        throw new BadRequestException("Invalid assessment year")
      }
    }
  }

  private serializeDemand(d: {
    id: string
    surveyId: string
    assessmentYearId: string
    status: string
    propertyTax: { toString(): string } | number
    waterTax: { toString(): string } | number
    drainageTax: { toString(): string } | number
    penalty: { toString(): string } | number
    rebate: { toString(): string } | number
    arrears: { toString(): string } | number
    currentDemand: { toString(): string } | number
    totalPayable: { toString(): string } | number
    amountPaid: { toString(): string } | number
    outstanding: { toString(): string } | number
    verified: boolean
    publishedAt: Date | null
    assessmentYear?: { id: string; code: string; name: string } | null
    survey?: unknown
    demandArrears?: Array<{
      id: string
      sourceAssessmentYearId: string
      amount: { toString(): string } | number
      sourceAssessmentYear?: { id: string; code: string; name: string }
    }>
  }) {
    return {
      id: d.id,
      surveyId: d.surveyId,
      assessmentYearId: d.assessmentYearId,
      status: d.status,
      propertyTax: toNumber(d.propertyTax),
      waterTax: toNumber(d.waterTax),
      drainageTax: toNumber(d.drainageTax),
      penalty: toNumber(d.penalty),
      rebate: toNumber(d.rebate),
      arrears: toNumber(d.arrears),
      currentDemand: toNumber(d.currentDemand),
      totalPayable: toNumber(d.totalPayable),
      amountPaid: toNumber(d.amountPaid),
      outstanding: toNumber(d.outstanding),
      verified: d.verified,
      publishedAt: d.publishedAt?.toISOString() ?? null,
      assessmentYear: d.assessmentYear ?? null,
      survey: d.survey ?? null,
      demandArrears: (d.demandArrears ?? []).map((a) => ({
        id: a.id,
        sourceAssessmentYearId: a.sourceAssessmentYearId,
        amount: toNumber(a.amount),
        sourceAssessmentYear: a.sourceAssessmentYear ?? null,
      })),
    }
  }
}
