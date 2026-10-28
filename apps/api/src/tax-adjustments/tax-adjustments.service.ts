import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import type {
  CreateTaxAdjustmentDto,
  ListTaxAdjustmentsQueryDto,
  UpdateTaxAdjustmentDto,
} from "./dto/tax-adjustment.dto"

function toDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  return new Date(value)
}

@Injectable()
export class TaxAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private readonly include = {
    assessmentYear: true,
  } as const

  async list(query: ListTaxAdjustmentsQueryDto) {
    const search = query.search?.trim()
    return this.prisma.taxAdjustmentRule.findMany({
      where: {
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.head ? { head: query.head } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
      include: this.include,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    })
  }

  async getById(id: string) {
    const row = await this.prisma.taxAdjustmentRule.findUnique({
      where: { id },
      include: this.include,
    })
    if (!row) throw new NotFoundException("Tax adjustment rule not found")
    return row
  }

  async create(dto: CreateTaxAdjustmentDto, actorId?: string) {
    await this.assertAssessmentYear(dto.assessmentYearId)
    this.assertEffectiveRange(dto.effectiveFrom, dto.effectiveTo)

    const created = await this.prisma.taxAdjustmentRule.create({
      data: {
        kind: dto.kind,
        head: dto.head,
        name: dto.name.trim(),
        method: dto.method,
        value: dto.value,
        cap: dto.cap ?? null,
        assessmentYearId: dto.assessmentYearId || null,
        effectiveFrom: toDate(dto.effectiveFrom) ?? null,
        effectiveTo: toDate(dto.effectiveTo) ?? null,
        status: "DRAFT",
      },
      include: this.include,
    })

    await this.audit.log({
      action: "CREATE",
      entity: "TaxAdjustmentRule",
      entityId: created.id,
      newValue: this.snapshot(created),
      actorId,
    })

    return created
  }

  async update(id: string, dto: UpdateTaxAdjustmentDto, actorId?: string) {
    const existing = await this.getById(id)
    if (existing.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit archived tax adjustment rule")
    }
    if (existing.status === "PUBLISHED") {
      throw new BadRequestException(
        "Published rules are immutable. Archive and create a new draft to change values."
      )
    }

    if (dto.assessmentYearId !== undefined) {
      await this.assertAssessmentYear(dto.assessmentYearId)
    }
    this.assertEffectiveRange(
      dto.effectiveFrom !== undefined
        ? dto.effectiveFrom
        : existing.effectiveFrom?.toISOString() ?? null,
      dto.effectiveTo !== undefined
        ? dto.effectiveTo
        : existing.effectiveTo?.toISOString() ?? null
    )

    const updated = await this.prisma.taxAdjustmentRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.cap !== undefined ? { cap: dto.cap } : {}),
        ...(dto.assessmentYearId !== undefined
          ? { assessmentYearId: dto.assessmentYearId || null }
          : {}),
        ...(dto.effectiveFrom !== undefined
          ? { effectiveFrom: toDate(dto.effectiveFrom) }
          : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: toDate(dto.effectiveTo) }
          : {}),
      },
      include: this.include,
    })

    await this.audit.log({
      action: "UPDATE",
      entity: "TaxAdjustmentRule",
      entityId: id,
      oldValue: this.snapshot(existing),
      newValue: this.snapshot(updated),
      actorId,
    })

    return updated
  }

  async publish(id: string, actorId?: string) {
    const existing = await this.getById(id)
    if (existing.status === "ARCHIVED") {
      throw new BadRequestException("Cannot publish an archived rule")
    }

    const published = await this.prisma.taxAdjustmentRule.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: actorId,
      },
      include: this.include,
    })

    await this.audit.log({
      action: "PUBLISH",
      entity: "TaxAdjustmentRule",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "PUBLISHED" },
      actorId,
    })

    return published
  }

  async archive(id: string, actorId?: string) {
    const existing = await this.getById(id)
    if (existing.status === "ARCHIVED") {
      return existing
    }

    const archived = await this.prisma.taxAdjustmentRule.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: this.include,
    })

    await this.audit.log({
      action: "ARCHIVE",
      entity: "TaxAdjustmentRule",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "ARCHIVED" },
      actorId,
    })

    return archived
  }

  async remove(id: string, actorId?: string) {
    const existing = await this.getById(id)
    if (existing.status === "PUBLISHED") {
      throw new BadRequestException(
        "Cannot delete a published rule. Archive it instead."
      )
    }

    await this.prisma.taxAdjustmentRule.delete({ where: { id } })
    await this.audit.log({
      action: "DELETE",
      entity: "TaxAdjustmentRule",
      entityId: id,
      oldValue: this.snapshot(existing),
      actorId,
    })

    return { deleted: true }
  }

  private snapshot(row: {
    id: string
    kind: string
    head: string
    name: string
    method: string
    value: { toString(): string } | number
    cap: { toString(): string } | number | null
    status: string
    assessmentYearId: string | null
  }): Prisma.InputJsonValue {
    return {
      id: row.id,
      kind: row.kind,
      head: row.head,
      name: row.name,
      method: row.method,
      value: Number(row.value),
      cap: row.cap == null ? null : Number(row.cap),
      status: row.status,
      assessmentYearId: row.assessmentYearId,
    }
  }

  private async assertAssessmentYear(assessmentYearId?: string | null) {
    if (!assessmentYearId) return
    const year = await this.prisma.referenceEntry.findUnique({
      where: { id: assessmentYearId },
      include: { category: true },
    })
    if (!year || year.category.code !== "ASSESSMENT_YEAR") {
      throw new BadRequestException("Invalid assessment year")
    }
  }

  private assertEffectiveRange(
    from?: string | null,
    to?: string | null
  ) {
    if (!from || !to) return
    if (new Date(from).getTime() > new Date(to).getTime()) {
      throw new BadRequestException(
        "effectiveFrom must be on or before effectiveTo"
      )
    }
  }
}
