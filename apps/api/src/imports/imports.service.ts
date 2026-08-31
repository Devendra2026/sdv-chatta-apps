import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common"
import { DuplicateStrategy, ImportJobStatus, Prisma } from "@prisma/client"
import { resolveImportSurveyId } from "@workspace/types"
import { Queue } from "bullmq"
import ExcelJS from "exceljs"
import IORedis from "ioredis"

import type { AuthUser } from "../auth/auth.decorators"
import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import { StorageService } from "../storage/storage.service"
import { getUlbCode } from "../surveys/survey-id.util"
import { computeDataQuality, parseFloorsRaw } from "../surveys/floors.util"
import {
  diffSurveyChanges,
  surveyToAuditSnapshot,
} from "../surveys/survey-audit.util"
import {
  cell,
  detectPresetFromHeaders,
  extractWardNumber,
  getMapping,
  normalizeParcelNo,
  normalizePropertyNo,
  parseBool,
  parseNumber,
  parseSurveyedAt,
  type MappingPreset,
} from "./column-maps"
import {
  buildSurveyExportFilename,
  buildSurveyExportWorkbook,
  detectExportPreset,
  type SurveyExportRecord,
} from "./survey-excel-export"

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name)
  private queue: Queue | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService
  ) {
    try {
      const connection = new IORedis(
        process.env.REDIS_URL ?? "redis://localhost:6379",
        {
          maxRetriesPerRequest: null,
        }
      )
      this.queue = new Queue("survey-import", { connection })
    } catch (err) {
      this.logger.warn(`BullMQ queue unavailable: ${String(err)}`)
    }
  }

  async createUpload(
    file: Express.Multer.File,
    user: AuthUser,
    duplicateStrategy: DuplicateStrategy = "UPDATE"
  ) {
    const objectKey = `imports/${Date.now()}-${file.originalname}`
    await this.storage.putObject(objectKey, file.buffer, file.mimetype)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.getWorksheet("Survey Data") ?? workbook.worksheets[0]
    const headerRow = sheet?.getRow(1)
    const columnCount = Math.max(
      headerRow?.cellCount ?? 0,
      sheet?.columnCount ?? 0
    )
    const headers: string[] = []
    for (let col = 1; col <= columnCount; col++) {
      headers[col - 1] = cell([headerRow?.getCell(col)?.value], 0)
    }
    const mappingPreset = detectPresetFromHeaders(headers, columnCount)

    const job = await this.prisma.importJob.create({
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        objectKey,
        status: ImportJobStatus.READY,
        mappingPreset,
        duplicateStrategy,
        createdById: user.id,
        totalRows: Math.max(0, (sheet?.rowCount ?? 1) - 1),
      },
    })

    return job
  }

  async start(jobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException("Import job not found")

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.PROCESSING, startedAt: new Date() },
    })

    if (this.queue) {
      await this.queue.add("process", { jobId }, { removeOnComplete: 100 })
    } else {
      // Fallback: process inline when Redis is down
      await this.processJob(jobId)
    }

    return this.getJob(jobId)
  }

  async getJob(jobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: { errors: { take: 100, orderBy: { rowNumber: "asc" } } },
    })
    if (!job) throw new NotFoundException("Import job not found")
    return job
  }

  async list(
    page = 1,
    pageSize = 20,
    filters?: { status?: string; q?: string }
  ) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
    const safeSize =
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(100, Math.floor(pageSize))
        : 20

    const where: Prisma.ImportJobWhereInput = {}
    const status = filters?.status?.trim()
    if (status) {
      if (!Object.values(ImportJobStatus).includes(status as ImportJobStatus)) {
        throw new BadRequestException("Invalid import status")
      }
      where.status = status as ImportJobStatus
    }
    const q = filters?.q?.trim()
    if (q) {
      where.fileName = { contains: q, mode: "insensitive" }
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.importJob.count({ where }),
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ])
    return {
      items,
      meta: {
        page: safePage,
        pageSize: safeSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeSize)),
      },
    }
  }

  async reprocessJob(jobId: string, duplicateStrategy: DuplicateStrategy) {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        duplicateStrategy,
        status: ImportJobStatus.PROCESSING,
        startedAt: new Date(),
        completedAt: null,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        skippedRows: 0,
        insertedRows: 0,
        updatedRows: 0,
      },
    })
    await this.prisma.importError.deleteMany({ where: { importJobId: jobId } })
    return this.processJob(jobId)
  }

  async processJob(jobId: string) {
    const job = await this.prisma.importJob.findUniqueOrThrow({
      where: { id: jobId },
    })
    if (!job.objectKey) throw new Error("Missing object key")

    const buffer = await this.storage.getObject(job.objectKey)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.getWorksheet("Survey Data") ?? workbook.worksheets[0]
    if (!sheet) throw new Error("Sheet not found")

    const columnCount = Math.max(sheet.columnCount, 1)
    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    for (let col = 1; col <= columnCount; col++) {
      headers[col - 1] = cell([headerRow.getCell(col).value], 0)
    }
    const preset =
      (job.mappingPreset as MappingPreset) ||
      detectPresetFromHeaders(headers, columnCount)
    const map = getMapping(preset)
    const wards = await this.prisma.ward.findMany()
    const wardByNumber = new Map(wards.map((w) => [w.number, w]))

    let success = 0
    let failed = 0
    let skipped = 0
    let inserted = 0
    let updated = 0
    let processed = 0

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const excelRow = sheet.getRow(rowNumber)
      const values: unknown[] = []
      for (let col = 1; col <= columnCount; col++) {
        values[col - 1] = excelRow.getCell(col).value
      }

      const rawSurveyId = cell(values, map.surveyId)
      if (!rawSurveyId) continue
      processed++

      try {
        const wardName = cell(values, map.wardName)
        const wardNumber = extractWardNumber(wardName, rawSurveyId)
        const ward = wardNumber ? wardByNumber.get(wardNumber) : undefined
        if (!ward) {
          throw new Error(`Ward not found for ${wardName || rawSurveyId}`)
        }

        const mobileRaw = cell(values, map.mobile)
        const mobile = !mobileRaw || mobileRaw === "0" ? "" : mobileRaw
        const floorsRaw = cell(values, map.floorsRaw)
        const floors = parseFloorsRaw(floorsRaw)
        const plotAreaSqFt = parseNumber(cell(values, map.plotAreaSqFt))
        const plotAreaSqMeter = parseNumber(cell(values, map.plotAreaSqMeter))
        const plinthAreaSqFt = parseNumber(cell(values, map.plinthAreaSqFt))
        const plinthAreaSqMeter = parseNumber(
          cell(values, map.plinthAreaSqMeter)
        )
        const totalBuiltUpAreaSqFt = parseNumber(
          cell(values, map.totalBuiltUpAreaSqFt)
        )
        const totalBuiltUpAreaSqMeter = parseNumber(
          cell(values, map.totalBuiltUpAreaSqMeter)
        )
        const parcelNo = normalizeParcelNo(cell(values, map.parcelNo), rawSurveyId)
        const propertyNo = normalizePropertyNo(
          cell(values, map.propertyNo),
          rawSurveyId
        )
        const surveyId = resolveImportSurveyId(
          rawSurveyId,
          ward.number,
          parcelNo ?? "",
          propertyNo ?? "",
          getUlbCode()
        )

        const payload = {
          surveyId,
          wardId: ward.id,
          surveyedAt: parseSurveyedAt(cell(values, map.surveyedAt)),
          ownerName: cell(values, map.ownerName) || null,
          ownerFatherName: cell(values, map.ownerFatherName) || null,
          mobile: mobile || null,
          isSlum: parseBool(cell(values, map.isSlum)) ?? false,
          remark: cell(values, map.remark) || null,
          parcelNo,
          propertyNo,
          electricityId: cell(values, map.electricityId) || null,
          khasraNo: cell(values, map.khasraNo) || null,
          registryNo: cell(values, map.registryNo) || null,
          constructedDate: cell(values, map.constructedDate) || null,
          respondentName: cell(values, map.respondentName) || null,
          respondentRelationship:
            cell(values, map.respondentRelationship) || null,
          city: cell(values, map.city) || null,
          pincode: cell(values, map.pincode) || null,
          houseNo: cell(values, map.houseNo) || null,
          streetName: cell(values, map.streetName) || null,
          locality: cell(values, map.locality) || null,
          colony: cell(values, map.colony) || null,
          presentHouseNo: cell(values, map.presentHouseNo) || null,
          presentStreetName: cell(values, map.presentStreetName) || null,
          presentLocality: cell(values, map.presentLocality) || null,
          presentColony: cell(values, map.presentColony) || null,
          presentCity: cell(values, map.presentCity) || null,
          presentPincode: cell(values, map.presentPincode) || null,
          isSameAsProperty: parseBool(cell(values, map.isSameAsProperty)),
          taxRateZone: cell(values, map.taxRateZone) || null,
          propertyOwnership: cell(values, map.propertyOwnership) || null,
          propertyUse: cell(values, map.propertyUse) || null,
          commercial: cell(values, map.commercial) || null,
          yearOfConstruction: cell(values, map.yearOfConstruction) || null,
          exemptionType: cell(values, map.exemptionType) || null,
          exemptionApplicable: parseBool(cell(values, map.exemptionApplicable)),
          situation: cell(values, map.situation) || null,
          roadType: cell(values, map.roadType) || null,
          floorsRaw: floorsRaw || null,
          plotAreaSqFt,
          plotAreaSqMeter,
          plinthAreaSqFt,
          plinthAreaSqMeter,
          totalBuiltUpAreaSqFt,
          totalBuiltUpAreaSqMeter,
          hasMunicipalWaterSupply: parseBool(
            cell(values, map.hasMunicipalWaterSupply)
          ),
          hasAlternateWater: parseBool(cell(values, map.hasAlternateWater)),
          waterSourceType: cell(values, map.waterSourceType) || null,
          totalWaterConnections: parseNumber(
            cell(values, map.totalWaterConnections)
          ),
          waterConnectionIdType:
            cell(values, map.waterConnectionIdType) || null,
          toiletType: cell(values, map.toiletType) || null,
          hasMunicipalWasteService: parseBool(
            cell(values, map.hasMunicipalWasteService)
          ),
          ownerAadhaar: cell(values, map.ownerAadhaar) || null,
          dataQualityStatus: computeDataQuality({
            mobile,
            propertyNo,
            parcelNo,
            plotAreaSqFt,
            totalBuiltUpAreaSqFt,
          }),
          importJobId: job.id,
          status: "ACTIVE" as const,
        }

        const existing = await this.findImportDuplicate({
          surveyId,
          rawSurveyId,
          wardId: ward.id,
          parcelNo,
          propertyNo,
        })

        if (existing && !existing.deletedAt) {
          if (job.duplicateStrategy === "SKIP") {
            skipped++
            success++
            continue
          }
          if (job.duplicateStrategy === "UPDATE") {
            const beforeAudit = surveyToAuditSnapshot(
              existing as unknown as Record<string, unknown>
            )
            const updatedSurvey = await this.prisma.$transaction(async (tx) => {
              await tx.surveyFloor.deleteMany({
                where: { surveyId: existing.id },
              })
              return tx.survey.update({
                where: { id: existing.id },
                data: {
                  ...payload,
                  floors: {
                    create: floors.map((f) => ({
                      floorLabel: f.floorLabel,
                      areaSqFt: f.areaSqFt,
                      areaSqMeter: f.areaSqMeter,
                      usageType: f.usageType,
                      usageFactor: f.usageFactor,
                      buildingType: f.buildingType,
                      sortOrder: f.sortOrder,
                      rawSegment: f.rawSegment,
                    })),
                  },
                },
              })
            })
            const afterAudit = surveyToAuditSnapshot(
              updatedSurvey as unknown as Record<string, unknown>
            )
            const auditDiff = diffSurveyChanges(beforeAudit, afterAudit)
            if (auditDiff.changes.length > 0) {
              await this.audit.log({
                action: "SURVEY_UPDATED",
                entity: "Survey",
                entityId: existing.id,
                actorId: job.createdById ?? undefined,
                newValue: {
                  changes: auditDiff.changes,
                  source: "import",
                } as Prisma.InputJsonValue,
              })
            }
            updated++
            success++
            continue
          }
        }

        await this.prisma.survey.create({
          data: {
            ...payload,
            floors: {
              create: floors.map((f) => ({
                floorLabel: f.floorLabel,
                areaSqFt: f.areaSqFt,
                areaSqMeter: f.areaSqMeter,
                usageType: f.usageType,
                usageFactor: f.usageFactor,
                buildingType: f.buildingType,
                sortOrder: f.sortOrder,
                rawSegment: f.rawSegment,
              })),
            },
          },
        })
        inserted++
        success++
      } catch (err) {
        failed++
        await this.prisma.importError.create({
          data: {
            importJobId: job.id,
            rowNumber,
            surveyId: rawSurveyId || null,
            message: err instanceof Error ? err.message : "Import row failed",
            severity: "error",
          },
        })
      }
    }

    const status =
      failed === 0
        ? ImportJobStatus.COMPLETED
        : success > 0
          ? ImportJobStatus.PARTIAL
          : ImportJobStatus.FAILED

    return this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status,
        processedRows: processed,
        successRows: success,
        failedRows: failed,
        skippedRows: skipped,
        insertedRows: inserted,
        updatedRows: updated,
        completedAt: new Date(),
      },
    })
  }

  /** Match existing survey by canonical id, legacy Excel id, or ward+parcel+property. */
  private async findImportDuplicate(input: {
    surveyId: string
    rawSurveyId: string
    wardId: string
    parcelNo: string | null
    propertyNo: string | null
  }) {
    const byCanonical = await this.prisma.survey.findUnique({
      where: { surveyId: input.surveyId },
    })
    if (byCanonical && !byCanonical.deletedAt) return byCanonical

    if (input.rawSurveyId !== input.surveyId) {
      const byRaw = await this.prisma.survey.findUnique({
        where: { surveyId: input.rawSurveyId },
      })
      if (byRaw && !byRaw.deletedAt) return byRaw
    }

    if (input.parcelNo && input.propertyNo) {
      return this.prisma.survey.findFirst({
        where: {
          wardId: input.wardId,
          parcelNo: input.parcelNo,
          propertyNo: input.propertyNo,
          deletedAt: null,
        },
      })
    }

    return null
  }

  async exportSurveys(
    filters: { wardId?: string; status?: string },
    user: AuthUser
  ) {
    const ward = filters.wardId
      ? await this.prisma.ward.findUnique({ where: { id: filters.wardId } })
      : null

    const surveys = await this.prisma.survey.findMany({
      where: {
        deletedAt: null,
        status: filters.status ? (filters.status as never) : { not: "DELETED" },
        ...(filters.wardId ? { wardId: filters.wardId } : {}),
      },
      include: { ward: true },
      orderBy: [
        { ward: { number: "asc" } },
        { parcelNo: "asc" },
        { surveyId: "asc" },
      ],
      take: 50000,
    })

    const preset = detectExportPreset(ward?.number)
    const workbook = buildSurveyExportWorkbook(
      surveys as SurveyExportRecord[],
      preset
    )
    const fileName = buildSurveyExportFilename({ wardNumber: ward?.number })

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const objectKey = `exports/${fileName}`
    await this.storage.putObject(
      objectKey,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    const job = await this.prisma.exportJob.create({
      data: {
        filters,
        status: "COMPLETED",
        fileKey: objectKey,
        fileName,
        rowCount: surveys.length,
        createdById: user.id,
        completedAt: new Date(),
      },
    })

    const url = await this.storage.getSignedUrl(objectKey, 600)
    return { job, url }
  }
}
