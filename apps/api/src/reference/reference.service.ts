import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import type {
  CreateAssessmentYearDto,
  UpdateAssessmentYearDto,
} from "./dto/assessment-year.dto"

const ASSESSMENT_YEAR = "ASSESSMENT_YEAR"

type YearRange = { startDate: string; endDate: string }

function parseYearRange(value: string | null | undefined): YearRange | null {
  if (!value?.trim()) return null
  try {
    const parsed = JSON.parse(value) as { startDate?: string; endDate?: string }
    if (
      typeof parsed?.startDate === "string" &&
      typeof parsed?.endDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.endDate)
    ) {
      return { startDate: parsed.startDate, endDate: parsed.endDate }
    }
  } catch {
    // legacy plain string values are ignored for overlap checks
  }
  return null
}

function rangesOverlap(a: YearRange, b: YearRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate
}

function buildValue(
  startDate?: string | null,
  endDate?: string | null,
  previous?: string | null
): string | null {
  const prev = parseYearRange(previous)
  const start = startDate === undefined ? prev?.startDate : startDate
  const end = endDate === undefined ? prev?.endDate : endDate
  if (start == null && end == null) {
    if (startDate === null && endDate === null) return null
    return previous ?? null
  }
  if (!start || !end) {
    throw new BadRequestException(
      "Both startDate and endDate are required when setting assessment year dates"
    )
  }
  if (start > end) {
    throw new BadRequestException("startDate must be on or before endDate")
  }
  return JSON.stringify({ startDate: start, endDate: end })
}

@Injectable()
export class ReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async assessmentYearCategoryId(): Promise<string> {
    const category = await this.prisma.referenceCategory.findUnique({
      where: { code: ASSESSMENT_YEAR },
    })
    if (!category) {
      throw new NotFoundException("ASSESSMENT_YEAR category not found")
    }
    return category.id
  }

  private async assertNoOverlap(
    categoryId: string,
    nextValue: string | null,
    excludeId?: string
  ) {
    const next = parseYearRange(nextValue)
    if (!next) return

    const actives = await this.prisma.referenceEntry.findMany({
      where: {
        categoryId,
        status: "ACTIVE",
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, code: true, name: true, value: true },
    })

    for (const row of actives) {
      const other = parseYearRange(row.value)
      if (other && rangesOverlap(next, other)) {
        throw new ConflictException(
          `Date range overlaps active assessment year ${row.name} (${row.code})`
        )
      }
    }
  }

  async createAssessmentYear(dto: CreateAssessmentYearDto, actorId?: string) {
    const categoryId = await this.assessmentYearCategoryId()
    const code = dto.code.trim().toUpperCase()

    const dup = await this.prisma.referenceEntry.findUnique({
      where: { categoryId_code: { categoryId, code } },
    })
    if (dup) {
      throw new ConflictException(`Assessment year code already exists: ${code}`)
    }

    const value = buildValue(dto.startDate, dto.endDate)
    await this.assertNoOverlap(categoryId, value)

    const created = await this.prisma.referenceEntry.create({
      data: {
        categoryId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        value,
        sortOrder: dto.sortOrder ?? 0,
        status: "ACTIVE",
      },
      include: { category: true },
    })

    await this.audit.log({
      action: "CREATE",
      entity: "ReferenceEntry",
      entityId: created.id,
      newValue: { code, name: created.name, value },
      actorId,
    })

    return created
  }

  async updateAssessmentYear(
    id: string,
    dto: UpdateAssessmentYearDto,
    actorId?: string
  ) {
    const existing = await this.requireAssessmentYear(id)
    const value = buildValue(dto.startDate, dto.endDate, existing.value)

    if (existing.status === "ACTIVE") {
      await this.assertNoOverlap(existing.categoryId, value, id)
    }

    const updated = await this.prisma.referenceEntry.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.startDate !== undefined || dto.endDate !== undefined
          ? { value }
          : {}),
      },
      include: { category: true },
    })

    await this.audit.log({
      action: "UPDATE",
      entity: "ReferenceEntry",
      entityId: id,
      oldValue: {
        name: existing.name,
        value: existing.value,
        status: existing.status,
      },
      newValue: {
        name: updated.name,
        value: updated.value,
        status: updated.status,
      },
      actorId,
    })

    return updated
  }

  async activateAssessmentYear(id: string, actorId?: string) {
    const existing = await this.requireAssessmentYear(id)
    await this.assertNoOverlap(existing.categoryId, existing.value, id)

    const updated = await this.prisma.referenceEntry.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { category: true },
    })

    await this.audit.log({
      action: "ACTIVATE",
      entity: "ReferenceEntry",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "ACTIVE" },
      actorId,
    })

    return updated
  }

  async deactivateAssessmentYear(id: string, actorId?: string) {
    const existing = await this.requireAssessmentYear(id)

    const updated = await this.prisma.referenceEntry.update({
      where: { id },
      data: { status: "INACTIVE" },
      include: { category: true },
    })

    await this.audit.log({
      action: "DEACTIVATE",
      entity: "ReferenceEntry",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "INACTIVE" },
      actorId,
    })

    return updated
  }

  async deleteAssessmentYear(id: string, actorId?: string) {
    const existing = await this.requireAssessmentYear(id)
    const refs = await this.countYearReferences(id)
    if (refs.taxConfigs > 0 || refs.demands > 0 || refs.payments > 0) {
      throw new BadRequestException(
        "Cannot delete assessment year while TaxConfig, PropertyDemand, or Payment records reference it. Deactivate instead."
      )
    }

    await this.prisma.referenceEntry.delete({ where: { id } })
    await this.audit.log({
      action: "DELETE",
      entity: "ReferenceEntry",
      entityId: id,
      oldValue: { code: existing.code, name: existing.name },
      actorId,
    })

    return { deleted: true }
  }

  private async requireAssessmentYear(id: string) {
    const entry = await this.prisma.referenceEntry.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!entry || entry.category.code !== ASSESSMENT_YEAR) {
      throw new NotFoundException("Assessment year not found")
    }
    return entry
  }

  private async countYearReferences(assessmentYearId: string) {
    const [taxConfigs, demands, payments] = await Promise.all([
      this.prisma.taxConfig.count({ where: { assessmentYearId } }),
      this.prisma.propertyDemand.count({ where: { assessmentYearId } }),
      this.prisma.payment.count({ where: { assessmentYearId } }),
    ])
    return { taxConfigs, demands, payments }
  }
}
