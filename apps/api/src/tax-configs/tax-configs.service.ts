import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Prisma, TaxConfig } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import { DemandsService } from "../demands/demands.service"
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

type TaxConfigWithCells = TaxConfig & {
  cells: Array<{
    roadWidthEntryId: string
    constructionEntryId: string
    annualRatePerSqFt: { toString(): string } | number | string
  }>
}

type RateParams = {
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
  penaltyPct: number
  assessablePct: number
  commercialAssessablePct: number
}

@Injectable()
export class TaxConfigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly demands: DemandsService
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

  private assertEditableDraft(existing: TaxConfig) {
    if (existing.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit archived tax config")
    }
    if (existing.status === "PUBLISHED") {
      throw new BadRequestException(
        "Published tax configs are immutable. Create a new draft or copy before editing parameters."
      )
    }
  }

  private async writeCells(id: string, cells: UpsertTaxCellDto[]) {
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
  }

  private async writeParams(id: string, params: RateParams) {
    await this.prisma.taxConfig.update({
      where: { id },
      data: {
        propertyTaxPct: params.propertyTaxPct,
        waterTaxPct: params.waterTaxPct,
        drainageTaxPct: params.drainageTaxPct,
        penaltyPct: params.penaltyPct,
        assessablePct: params.assessablePct,
        commercialAssessablePct: params.commercialAssessablePct,
      },
    })
  }

  private resolveParams(
    source: TaxConfigWithCells,
    dto: Partial<RateParams>
  ): RateParams {
    return {
      propertyTaxPct: dto.propertyTaxPct ?? toNumber(source.propertyTaxPct),
      waterTaxPct: dto.waterTaxPct ?? toNumber(source.waterTaxPct),
      drainageTaxPct: dto.drainageTaxPct ?? toNumber(source.drainageTaxPct),
      penaltyPct: dto.penaltyPct ?? toNumber(source.penaltyPct),
      assessablePct: dto.assessablePct ?? toNumber(source.assessablePct),
      commercialAssessablePct:
        dto.commercialAssessablePct ?? toNumber(source.commercialAssessablePct),
    }
  }

  private resolveCells(
    source: TaxConfigWithCells,
    cells?: UpsertTaxCellDto[]
  ): UpsertTaxCellDto[] {
    if (cells?.length) return cells
    return source.cells.map((c) => ({
      roadWidthEntryId: c.roadWidthEntryId,
      constructionEntryId: c.constructionEntryId,
      annualRatePerSqFt: toNumber(c.annualRatePerSqFt),
    }))
  }

  /**
   * Writes rates/params. For PUBLISHED configs, also appends a version
   * snapshot and increments version so live demands stay aligned.
   */
  private async applyRatesToConfig(
    config: TaxConfigWithCells,
    cells: UpsertTaxCellDto[],
    params: RateParams,
    actorId?: string
  ) {
    if (config.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit archived tax config")
    }

    await this.writeCells(config.id, cells)
    await this.writeParams(config.id, params)

    if (config.status === "PUBLISHED") {
      const nextVersion = config.version + 1
      const snapshot = {
        params,
        cells: cells.map((c) => ({
          roadWidthEntryId: c.roadWidthEntryId,
          constructionEntryId: c.constructionEntryId,
          annualRatePerSqFt: c.annualRatePerSqFt,
        })),
      }
      await this.prisma.taxConfigVersion.create({
        data: {
          taxConfigId: config.id,
          version: nextVersion,
          snapshot,
          createdById: actorId,
        },
      })
      await this.prisma.taxConfig.update({
        where: { id: config.id },
        data: {
          version: nextVersion,
          publishedAt: new Date(),
          publishedById: actorId,
        },
      })
    }

    await this.audit.log({
      action: "APPLY_RATES",
      entity: "TaxConfig",
      entityId: config.id,
      newValue: { cells, params } as unknown as Prisma.InputJsonValue,
      actorId,
    })

    return this.prisma.taxConfig.findUniqueOrThrow({
      where: { id: config.id },
      include: this.include,
    })
  }

  async updateParams(
    id: string,
    dto: UpdateTaxConfigParamsDto,
    actorId?: string
  ) {
    const existing = await this.prisma.taxConfig.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException("Tax config not found")
    this.assertEditableDraft(existing)

    const updated = await this.prisma.taxConfig.update({
      where: { id },
      data: {
        propertyTaxPct: dto.propertyTaxPct,
        waterTaxPct: dto.waterTaxPct,
        drainageTaxPct: dto.drainageTaxPct,
        penaltyPct: dto.penaltyPct,
        assessablePct: dto.assessablePct,
        commercialAssessablePct: dto.commercialAssessablePct,
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
    if (existing.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit archived tax config")
    }
    if (existing.status === "PUBLISHED") {
      throw new BadRequestException(
        "Published tax configs are immutable. Create a new draft or copy before editing rate cells."
      )
    }

    await this.writeCells(id, cells)

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
    const cells = this.resolveCells(source, dto.cells)
    const params = this.resolveParams(source, dto)
    const publishAligned = source.status === "PUBLISHED"
    const alignedVersion = source.version

    const wards = await this.prisma.ward.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    let updated = 0
    let skippedArchived = 0
    let demandsCreated = 0
    let demandsUpdated = 0

    for (const ward of wards) {
      const config =
        ward.id === dto.sourceWardId
          ? source
          : await this.getOrCreate(ward.id, dto.assessmentYearId, actorId)

      if (config.status === "ARCHIVED") {
        if (ward.id !== dto.sourceWardId) skippedArchived += 1
        continue
      }

      if (publishAligned) {
        await this.applyPublishedRatesAtVersion(
          config,
          cells,
          params,
          alignedVersion,
          actorId
        )
        const demandCounts = await this.demands.publishForWard(
          config.wardId,
          dto.assessmentYearId,
          actorId
        )
        demandsCreated += demandCounts.created
        demandsUpdated += demandCounts.updated
      } else {
        await this.applyRatesToConfig(config, cells, params, actorId)
      }

      if (ward.id !== dto.sourceWardId) updated += 1
    }

    return {
      updated,
      skippedPublished: skippedArchived,
      skippedArchived,
      version: publishAligned ? alignedVersion : undefined,
      demands: {
        created: demandsCreated,
        updated: demandsUpdated,
        total: demandsCreated + demandsUpdated,
      },
    }
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
    let config = await this.prisma.taxConfig.findUnique({
      where: { id },
      include: this.include,
    })
    if (!config) throw new NotFoundException("Tax config not found")
    if (config.status === "ARCHIVED") {
      throw new BadRequestException("Cannot publish archived tax config")
    }

    const hasPayload =
      (dto.cells?.length ?? 0) > 0 ||
      dto.propertyTaxPct !== undefined ||
      dto.waterTaxPct !== undefined ||
      dto.drainageTaxPct !== undefined ||
      dto.penaltyPct !== undefined ||
      dto.assessablePct !== undefined ||
      dto.commercialAssessablePct !== undefined

    const cells = this.resolveCells(config, dto.cells)
    const params = this.resolveParams(config, dto)
    const nextSnapshot = this.buildRateSnapshot(cells, params)
    const currentSnapshot = this.buildRateSnapshot(
      this.resolveCells(config),
      this.resolveParams(config, {})
    )
    const ratesUnchanged =
      config.status === "PUBLISHED" &&
      this.rateSnapshotsEqual(currentSnapshot, nextSnapshot)

    if (hasPayload && !ratesUnchanged) {
      // Write rates without version bump here; publish creates the snapshot.
      await this.writeCells(config.id, cells)
      await this.writeParams(config.id, params)
      config = await this.prisma.taxConfig.findUniqueOrThrow({
        where: { id },
        include: this.include,
      })
    }

    const nextVersion = ratesUnchanged
      ? config.version
      : config.version + (config.status === "PUBLISHED" ? 1 : 0)
    const snapshot = ratesUnchanged
      ? currentSnapshot
      : this.buildRateSnapshot(
          this.resolveCells(config, hasPayload ? cells : undefined),
          this.resolveParams(config, hasPayload ? params : {})
        )

    if (!ratesUnchanged) {
      await this.prisma.taxConfigVersion.create({
        data: {
          taxConfigId: id,
          version: nextVersion || config.version,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          createdById: actorId,
        },
      })
    }

    const published = await this.prisma.taxConfig.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        version: nextVersion || config.version,
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
      newValue: {
        version: published.version,
        ratesUnchanged,
      },
      metadata: dto.reason ? { reason: dto.reason } : undefined,
      actorId,
    })

    const demands = await this.demands.publishForWard(
      published.wardId,
      published.assessmentYearId,
      actorId
    )

    return {
      ...published,
      demands,
      ratesUnchanged,
    }
  }

  private buildRateSnapshot(
    cells: UpsertTaxCellDto[],
    params: RateParams
  ): {
    params: RateParams
    cells: UpsertTaxCellDto[]
  } {
    return {
      params: { ...params },
      cells: cells
        .map((c) => ({
          roadWidthEntryId: c.roadWidthEntryId,
          constructionEntryId: c.constructionEntryId,
          annualRatePerSqFt: Number(c.annualRatePerSqFt),
        }))
        .sort((a, b) =>
          `${a.roadWidthEntryId}:${a.constructionEntryId}`.localeCompare(
            `${b.roadWidthEntryId}:${b.constructionEntryId}`
          )
        ),
    }
  }

  private rateSnapshotsEqual(
    a: { params: RateParams; cells: UpsertTaxCellDto[] },
    b: { params: RateParams; cells: UpsertTaxCellDto[] }
  ): boolean {
    const paramKeys: (keyof RateParams)[] = [
      "propertyTaxPct",
      "waterTaxPct",
      "drainageTaxPct",
      "penaltyPct",
      "assessablePct",
      "commercialAssessablePct",
    ]
    for (const key of paramKeys) {
      if (Number(a.params[key]) !== Number(b.params[key])) return false
    }
    if (a.cells.length !== b.cells.length) return false
    for (let i = 0; i < a.cells.length; i += 1) {
      const left = a.cells[i]!
      const right = b.cells[i]!
      if (
        left.roadWidthEntryId !== right.roadWidthEntryId ||
        left.constructionEntryId !== right.constructionEntryId ||
        Number(left.annualRatePerSqFt) !== Number(right.annualRatePerSqFt)
      ) {
        return false
      }
    }
    return true
  }

  /**
   * Writes rates onto a ward config and publishes it at a fixed version
   * (used by copy-to-all-wards so every ward shares the source version).
   */
  private async applyPublishedRatesAtVersion(
    config: TaxConfigWithCells,
    cells: UpsertTaxCellDto[],
    params: RateParams,
    version: number,
    actorId?: string
  ) {
    if (config.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit archived tax config")
    }

    await this.writeCells(config.id, cells)
    await this.writeParams(config.id, params)

    const snapshot = this.buildRateSnapshot(
      cells,
      params
    ) as unknown as Prisma.InputJsonValue
    const existingVersion = await this.prisma.taxConfigVersion.findFirst({
      where: { taxConfigId: config.id, version },
      select: { id: true },
    })
    if (existingVersion) {
      await this.prisma.taxConfigVersion.update({
        where: { id: existingVersion.id },
        data: {
          snapshot,
          createdById: actorId,
        },
      })
    } else {
      await this.prisma.taxConfigVersion.create({
        data: {
          taxConfigId: config.id,
          version,
          snapshot,
          createdById: actorId,
        },
      })
    }

    await this.prisma.taxConfig.update({
      where: { id: config.id },
      data: {
        status: "PUBLISHED",
        version,
        publishedAt: new Date(),
        publishedById: actorId,
      },
    })

    await this.audit.log({
      action: "COPY_PUBLISH",
      entity: "TaxConfig",
      entityId: config.id,
      newValue: { version, cells, params } as unknown as Prisma.InputJsonValue,
      actorId,
    })
  }
}
