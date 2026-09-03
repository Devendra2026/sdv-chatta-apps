import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import { computeGisPreviewDemand } from "../tax/tax-calc"
import type {
  CopyTaxToWardsDto,
  PublishTaxConfigDto,
  TaxPreviewDto,
  UpdateTaxConfigParamsDto,
  UpsertTaxCellDto,
} from "./dto/tax-config.dto"

function toNumber(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value)
}

@Injectable()
export class TaxConfigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private readonly include = {
    cells: {
      include: {
        roadWidthEntry: true,
        constructionEntry: true,
      },
    },
    assessmentYear: true,
    ward: true,
  } as const

  async getOrCreate(
    wardId: string,
    assessmentYearId: string,
    actorId?: string
  ) {
    const existing = await this.prisma.taxConfig.findUnique({
      where: { wardId_assessmentYearId: { wardId, assessmentYearId } },
      include: this.include,
    })
    if (existing) return existing

    const ward = await this.prisma.ward.findUnique({ where: { id: wardId } })
    if (!ward) throw new NotFoundException("Ward not found")

    const ay = await this.prisma.referenceEntry.findUnique({
      where: { id: assessmentYearId },
    })
    if (!ay) throw new NotFoundException("Assessment year not found")

    const created = await this.prisma.taxConfig.create({
      data: {
        wardId,
        assessmentYearId,
        status: "DRAFT",
      },
      include: this.include,
    })

    await this.ensureMatrixCells(created.id)

    const full = await this.prisma.taxConfig.findUniqueOrThrow({
      where: { id: created.id },
      include: this.include,
    })

    await this.audit.log({
      action: "CREATE",
      entity: "TaxConfig",
      entityId: full.id,
      newValue: { wardId, assessmentYearId },
      actorId,
    })

    return full
  }

  async getPublishedForWard(wardId: string, assessmentYearId: string) {
    const config = await this.prisma.taxConfig.findUnique({
      where: { wardId_assessmentYearId: { wardId, assessmentYearId } },
      include: this.include,
    })
    if (!config || config.status !== "PUBLISHED") {
      throw new ConflictException(
        "No published tax configuration for this ward and assessment year. Configure and publish rates on Reports first."
      )
    }
    return config
  }

  private async ensureMatrixCells(taxConfigId: string) {
    const [roads, constructions] = await Promise.all([
      this.prisma.referenceEntry.findMany({
        where: { category: { code: "TAX_RATE_ZONE" }, status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.referenceEntry.findMany({
        where: { category: { code: "CONSTRUCTION_TYPE" }, status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      }),
    ])

    for (const road of roads) {
      for (const construction of constructions) {
        await this.prisma.taxRateCell.upsert({
          where: {
            taxConfigId_roadWidthEntryId_constructionEntryId: {
              taxConfigId,
              roadWidthEntryId: road.id,
              constructionEntryId: construction.id,
            },
          },
          create: {
            taxConfigId,
            roadWidthEntryId: road.id,
            constructionEntryId: construction.id,
            annualRatePerSqFt: 0,
          },
          update: {},
        })
      }
    }
  }

  async updateParams(
    id: string,
    dto: UpdateTaxConfigParamsDto,
    actorId?: string
  ) {
    const existing = await this.prisma.taxConfig.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException("Tax config not found")
    if (existing.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit archived tax config")
    }

    const updated = await this.prisma.taxConfig.update({
      where: { id },
      data: {
        propertyTaxPct: dto.propertyTaxPct,
        waterTaxPct: dto.waterTaxPct,
        drainageTaxPct: dto.drainageTaxPct,
        penaltyPct: dto.penaltyPct,
        assessablePct: dto.assessablePct,
        commercialAssessablePct: dto.commercialAssessablePct,
        status: "DRAFT",
      },
      include: this.include,
    })

    await this.audit.log({
      action: "UPDATE_PARAMS",
      entity: "TaxConfig",
      entityId: id,
      oldValue: existing,
      newValue: updated,
      metadata: dto.reason ? { reason: dto.reason } : undefined,
      actorId,
    })

    return updated
  }

  async upsertCells(id: string, cells: UpsertTaxCellDto[], actorId?: string) {
    const existing = await this.prisma.taxConfig.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException("Tax config not found")

    for (const cell of cells) {
      await this.prisma.taxRateCell.upsert({
        where: {
          taxConfigId_roadWidthEntryId_constructionEntryId: {
            taxConfigId: id,
            roadWidthEntryId: cell.roadWidthEntryId,
            constructionEntryId: cell.constructionEntryId,
          },
        },
        create: {
          taxConfigId: id,
          roadWidthEntryId: cell.roadWidthEntryId,
          constructionEntryId: cell.constructionEntryId,
          annualRatePerSqFt: cell.annualRatePerSqFt,
        },
        update: {
          annualRatePerSqFt: cell.annualRatePerSqFt,
        },
      })
    }

    await this.prisma.taxConfig.update({
      where: { id },
      data: { status: "DRAFT" },
    })

    await this.audit.log({
      action: "UPSERT_CELLS",
      entity: "TaxConfig",
      entityId: id,
      newValue: { cells } as unknown as Prisma.InputJsonValue,
      actorId,
    })

    return this.prisma.taxConfig.findUniqueOrThrow({
      where: { id },
      include: this.include,
    })
  }

  async copyToAllWards(dto: CopyTaxToWardsDto, actorId?: string) {
    const source = await this.getOrCreate(
      dto.sourceWardId,
      dto.assessmentYearId,
      actorId
    )
    const cells: UpsertTaxCellDto[] = source.cells.map((c) => ({
      roadWidthEntryId: c.roadWidthEntryId,
      constructionEntryId: c.constructionEntryId,
      annualRatePerSqFt: toNumber(c.annualRatePerSqFt),
    }))

    const wards = await this.prisma.ward.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    let updated = 0
    for (const ward of wards) {
      if (ward.id === dto.sourceWardId) continue
      const config = await this.getOrCreate(
        ward.id,
        dto.assessmentYearId,
        actorId
      )
      await this.upsertCells(config.id, cells, actorId)
      await this.updateParams(
        config.id,
        {
          propertyTaxPct: toNumber(source.propertyTaxPct),
          waterTaxPct: toNumber(source.waterTaxPct),
          drainageTaxPct: toNumber(source.drainageTaxPct),
          penaltyPct: toNumber(source.penaltyPct),
          assessablePct: toNumber(source.assessablePct),
          commercialAssessablePct: toNumber(source.commercialAssessablePct),
        },
        actorId
      )
      updated += 1
    }

    return { updated }
  }

  async preview(dto: TaxPreviewDto) {
    const config = await this.getOrCreate(dto.wardId, dto.assessmentYearId)
    const cell = config.cells.find(
      (c) =>
        c.roadWidthEntryId === dto.roadWidthEntryId &&
        c.constructionEntryId === dto.constructionEntryId
    )
    const baseMonthlyRate = cell ? toNumber(cell.annualRatePerSqFt) : 0
    const assessablePct = toNumber(config.assessablePct)
    const commercialAssessablePct = toNumber(config.commercialAssessablePct)
    const propertyTaxPct = toNumber(config.propertyTaxPct)
    const waterTaxPct = toNumber(config.waterTaxPct)
    const drainageTaxPct = toNumber(config.drainageTaxPct)
    const penaltyPct = toNumber(config.penaltyPct)

    const preview = computeGisPreviewDemand({
      areaSqFt: dto.areaSqFt,
      baseMonthlyRate,
      gisUseCode: dto.gisUseCode ?? "R",
      assessablePct,
      commercialAssessablePct,
      propertyTaxPct,
      waterTaxPct,
      drainageTaxPct,
      penaltyPct,
    })

    return {
      inputs: dto,
      rates: {
        annualRate: preview.effectiveMonthlyRate,
        assessablePct: preview.assessablePct,
        commercialAssessablePct,
        propertyTaxPct,
        waterTaxPct,
        drainageTaxPct,
        penaltyPct,
      },
      calculation: {
        grossAlv: preview.grossAlv,
        assessableAlv: preview.assessableAlv,
        propertyTax: preview.propertyTax,
        waterTax: preview.waterTax,
        drainageTax: preview.drainageTax,
        penalty: preview.penalty,
        demand: preview.demand,
      },
    }
  }

  async listVersions(taxConfigId: string) {
    return this.prisma.taxConfigVersion.findMany({
      where: { taxConfigId },
      orderBy: { version: "desc" },
    })
  }

  async publish(id: string, dto: PublishTaxConfigDto, actorId?: string) {
    const config = await this.prisma.taxConfig.findUnique({
      where: { id },
      include: this.include,
    })
    if (!config) throw new NotFoundException("Tax config not found")

    const nextVersion = config.version + (config.status === "PUBLISHED" ? 1 : 0)
    const snapshot = {
      params: {
        propertyTaxPct: toNumber(config.propertyTaxPct),
        waterTaxPct: toNumber(config.waterTaxPct),
        drainageTaxPct: toNumber(config.drainageTaxPct),
        penaltyPct: toNumber(config.penaltyPct),
        assessablePct: toNumber(config.assessablePct),
        commercialAssessablePct: toNumber(config.commercialAssessablePct),
      },
      cells: config.cells.map((c) => ({
        roadWidthEntryId: c.roadWidthEntryId,
        constructionEntryId: c.constructionEntryId,
        annualRatePerSqFt: toNumber(c.annualRatePerSqFt),
      })),
    }

    const versionRow = await this.prisma.taxConfigVersion.create({
      data: {
        taxConfigId: id,
        version: nextVersion || config.version,
        snapshot,
        reason: dto.reason,
        createdById: actorId,
      },
    })

    const published = await this.prisma.taxConfig.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        version: versionRow.version,
        publishedAt: new Date(),
        publishedById: actorId,
        changeReason: dto.reason,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
      },
      include: this.include,
    })

    await this.audit.log({
      action: "PUBLISH",
      entity: "TaxConfig",
      entityId: id,
      newValue: { version: versionRow.version },
      metadata: dto.reason ? { reason: dto.reason } : undefined,
      actorId,
    })

    return published
  }
}
