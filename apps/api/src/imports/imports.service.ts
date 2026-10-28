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

import { AuditService } from "../audit/audit.service"
import type { AuthUser } from "../auth/auth.decorators"
import { createBullMqRedisConnection } from "../common/redis.client"
import { PrismaService } from "../prisma/prisma.service"
import { StorageService } from "../storage/storage.service"
import { computeDataQuality, parseFloorsRaw } from "../surveys/floors.util"
import {
  diffSurveyChanges,
  surveyToAuditSnapshot,
} from "../surveys/survey-audit.util"
import { getUlbCode } from "../surveys/survey-id.util"
import {
  cell,
  extractWardNumber,
  listUnmappedHeaders,
  normalizeParcelNo,
  normalizePropertyNo,
  parseBool,
  parseNumber,
  parseSurveyedAt,
  resolveColumnMap,
  tryDetectPresetFromHeaders,
} from "./column-maps"
import {
  collectAreaInconsistencyMessages,
  columnMapToJson,
  getImportMaxFileSizeBytes,
  isAllowedChhataCity,
  type ImportPreviewResult,
  type ImportPreviewSampleRow,
} from "./import-preview"
import {
  orphanSurveyWhere,
  shouldPruneOrphanCount,
  shouldReconcileWardAfterImport,
} from "./import-reconcile"
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
      const connection = createBullMqRedisConnection()
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
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "Excel file is required",
      })
    }

    const maxBytes = getImportMaxFileSizeBytes()
    if (file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024))
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `File must be under ${maxMb}MB`,
      })
    }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.getWorksheet("Survey Data")
    if (!sheet) {
      throw new BadRequestException({
        code: "SHEET_MISSING",
        message: 'Workbook must include a sheet named "Survey Data"',
      })
    }

    const headerRow = sheet.getRow(1)
    const columnCount = Math.max(
      headerRow.cellCount ?? 0,
      sheet.columnCount ?? 0
    )
    const headers: string[] = []
    for (let col = 1; col <= columnCount; col++) {
      headers[col - 1] = cell([headerRow.getCell(col)?.value], 0)
    }
    const mappingPreset = tryDetectPresetFromHeaders(headers, columnCount)
    if (!mappingPreset) {
      throw new BadRequestException({
        code: "UNKNOWN_HEADER_PRESET",
        message:
          "Could not detect a supported Chhata survey header layout. Use a Ward 1 or Ward 2+ export workbook.",
      })
    }
    const { map } = resolveColumnMap(headers, columnCount)
    const columnMapping = columnMapToJson(
      map as unknown as Record<string, number>
    )

    const objectKey = `imports/${Date.now()}-${file.originalname}`
    await this.storage.putObject(objectKey, file.buffer, file.mimetype)

    const job = await this.prisma.importJob.create({
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        objectKey,
        status: ImportJobStatus.READY,
        mappingPreset,
        columnMapping,
        duplicateStrategy,
        createdById: user.id,
        totalRows: Math.max(0, (sheet.rowCount ?? 1) - 1),
      },
    })

    return job
  }

  async start(jobId: string, options?: { pruneMissing?: boolean }) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException("Import job not found")

    const pruneMissing = options?.pruneMissing === true

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.PROCESSING, startedAt: new Date() },
    })

    if (this.queue) {
      await this.queue.add(
        "process",
        { jobId, pruneMissing },
        { removeOnComplete: 100 }
      )
    } else {
      // Fallback: process inline when Redis is down
      await this.processJob(jobId, { pruneMissing })
    }

    return this.getJob(jobId)
  }

  async preview(jobId: string): Promise<ImportPreviewResult> {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException("Import job not found")
    if (!job.objectKey) {
      throw new BadRequestException({
        code: "MISSING_FILE",
        message: "Import file is missing",
      })
    }

    const buffer = await this.storage.getObject(job.objectKey)
    const { sheet, headers, columnCount, map, preset } =
      await this.loadSurveySheet(buffer)

    if (job.mappingPreset !== preset || !job.columnMapping) {
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          mappingPreset: preset,
          columnMapping: columnMapToJson(
            map as unknown as Record<string, number>
          ),
        },
      })
    }

    const wards = await this.prisma.ward.findMany()
    const wardByNumber = new Map(wards.map((w) => [w.number, w]))
    const fileSurveyIds = new Set<string>()
    const sampleRows: ImportPreviewSampleRow[] = []
    const warnings: string[] = []
    const unmappedHeaders = listUnmappedHeaders(headers)
    if (unmappedHeaders.length > 0) {
      warnings.push(
        `${unmappedHeaders.length} header(s) are not mapped to survey fields`
      )
    }

    let totalRows = 0
    let validRows = 0
    let invalidRows = 0
    let duplicateRows = 0
    let warningRows = 0

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const values = this.readRowValues(sheet.getRow(rowNumber), columnCount)
      const rawSurveyId = cell(values, map.surveyId)
      if (!rawSurveyId) continue
      totalRows++

      const rowMessages: string[] = []
      let classification: ImportPreviewSampleRow["classification"] = "valid"

      const wardName = cell(values, map.wardName)
      const wardNumber = extractWardNumber(wardName, rawSurveyId)
      const ward = wardNumber ? wardByNumber.get(wardNumber) : undefined
      if (!ward) {
        classification = "invalid"
        rowMessages.push(`Ward not found for ${wardName || rawSurveyId}`)
      }

      const excelParcelRaw = cell(values, map.parcelNo)
      const excelPropertyRaw = cell(values, map.propertyNo)
      const parcelNo = normalizeParcelNo(excelParcelRaw, rawSurveyId)
      const propertyNo = normalizePropertyNo(excelPropertyRaw, rawSurveyId)
      if (!parcelNo || !propertyNo) {
        classification = "invalid"
        rowMessages.push("Unparseable parcel or property number")
      }

      let surveyId = rawSurveyId
      if (ward && parcelNo && propertyNo) {
        surveyId = resolveImportSurveyId(
          rawSurveyId,
          ward.number,
          parcelNo,
          propertyNo,
          getUlbCode()
        )
      }

      if (classification !== "invalid") {
        if (fileSurveyIds.has(surveyId) || fileSurveyIds.has(rawSurveyId)) {
          classification = "duplicate"
          rowMessages.push("Duplicate Survey Id within this file")
        } else {
          fileSurveyIds.add(surveyId)
          fileSurveyIds.add(rawSurveyId)
          const existing = ward
            ? await this.findImportDuplicate({
                surveyId,
                rawSurveyId,
                wardId: ward.id,
                parcelNo,
                propertyNo,
              })
            : null
          if (existing) {
            classification = "duplicate"
            rowMessages.push("Survey already exists in the database")
          }
        }
      }

      const city = cell(values, map.city)
      if (city && !isAllowedChhataCity(city)) {
        rowMessages.push(`City outside Chhata / Chhata Rural: ${city}`)
        if (classification === "valid") classification = "warning"
      }

      const areaMessages = collectAreaInconsistencyMessages({
        plotAreaSqFt: parseNumber(cell(values, map.plotAreaSqFt)),
        plotAreaSqMeter: parseNumber(cell(values, map.plotAreaSqMeter)),
        plinthAreaSqFt: parseNumber(cell(values, map.plinthAreaSqFt)),
        plinthAreaSqMeter: parseNumber(cell(values, map.plinthAreaSqMeter)),
        totalBuiltUpAreaSqFt: parseNumber(
          cell(values, map.totalBuiltUpAreaSqFt)
        ),
        totalBuiltUpAreaSqMeter: parseNumber(
          cell(values, map.totalBuiltUpAreaSqMeter)
        ),
      })
      if (areaMessages.length > 0) {
        rowMessages.push(...areaMessages)
        if (classification === "valid") classification = "warning"
      }

      if (classification === "invalid") invalidRows++
      else if (classification === "duplicate") duplicateRows++
      else if (classification === "warning") warningRows++
      else validRows++

      if (sampleRows.length < 25 && rowMessages.length > 0) {
        sampleRows.push({
          rowNumber,
          surveyId: rawSurveyId,
          classification,
          messages: rowMessages,
        })
      } else if (sampleRows.length < 10 && classification === "valid") {
        sampleRows.push({
          rowNumber,
          surveyId: rawSurveyId,
          classification,
          messages: [],
        })
      }
    }

    if (invalidRows > 0) {
      warnings.push(`${invalidRows} row(s) are invalid and will fail on import`)
    }
    if (duplicateRows > 0) {
      warnings.push(
        `${duplicateRows} row(s) match duplicates (file or database)`
      )
    }

    return {
      totalRows,
      validRows,
      invalidRows,
      duplicateRows,
      warningRows,
      sampleRows,
      unmappedHeaders,
      columnMapping: columnMapToJson(map as unknown as Record<string, number>),
      warnings,
    }
  }

  async buildErrorsWorkbook(jobId: string): Promise<{
    buffer: Buffer
    fileName: string
  }> {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException("Import job not found")

    const errors = await this.prisma.importError.findMany({
      where: { importJobId: jobId },
      orderBy: [{ rowNumber: "asc" }, { createdAt: "asc" }],
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Import Errors")
    sheet.addRow(["rowNumber", "surveyId", "field", "message", "severity"])
    for (const err of errors) {
      sheet.addRow([
        err.rowNumber,
        err.surveyId ?? "",
        err.field ?? "",
        err.message,
        err.severity,
      ])
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const safeName = (job.fileName || "import").replace(/[^\w.-]+/g, "_")
    return {
      buffer,
      fileName: `import-errors-${safeName}-${job.id.slice(0, 8)}.xlsx`,
    }
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
        warningRows: 0,
      },
    })
    await this.prisma.importError.deleteMany({ where: { importJobId: jobId } })
    return this.processJob(jobId)
  }

  async processJob(jobId: string, options?: { pruneMissing?: boolean }) {
    const pruneMissing = options?.pruneMissing === true
    const job = await this.prisma.importJob.findUniqueOrThrow({
      where: { id: jobId },
    })
    if (!job.objectKey) throw new Error("Missing object key")

    const buffer = await this.storage.getObject(job.objectKey)
    const { sheet, columnCount, map, preset } =
      await this.loadSurveySheet(buffer)

    if (job.mappingPreset !== preset || !job.columnMapping) {
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          mappingPreset: preset,
          columnMapping: columnMapToJson(
            map as unknown as Record<string, number>
          ),
        },
      })
    }
    const wards = await this.prisma.ward.findMany()
    const wardByNumber = new Map(wards.map((w) => [w.number, w]))

    let success = 0
    let failed = 0
    let skipped = 0
    let inserted = 0
    let updated = 0
    let processed = 0
    let pruned = 0
    const touchedSurveyIds = new Set<string>()
    const wardIdsSeen = new Set<string>()

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const values = this.readRowValues(sheet.getRow(rowNumber), columnCount)

      const rawSurveyId = cell(values, map.surveyId)
      if (!rawSurveyId) continue
      processed++

      const wardName = cell(values, map.wardName)
      const excelParcelRaw = cell(values, map.parcelNo)
      const excelPropertyRaw = cell(values, map.propertyNo)
      const rawRowSnapshot = {
        surveyId: rawSurveyId,
        wardName,
        parcelNo: excelParcelRaw,
        propertyNo: excelPropertyRaw,
        ownerName: cell(values, map.ownerName),
        city: cell(values, map.city),
      }

      try {
        const wardNumber = extractWardNumber(wardName, rawSurveyId)
        const ward = wardNumber ? wardByNumber.get(wardNumber) : undefined
        if (!ward) {
          throw Object.assign(
            new Error(`Ward not found for ${wardName || rawSurveyId}`),
            { field: "wardName" }
          )
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
        const parcelNo = normalizeParcelNo(excelParcelRaw, rawSurveyId)
        const propertyNo = normalizePropertyNo(excelPropertyRaw, rawSurveyId)
        if (!parcelNo || !propertyNo) {
          throw Object.assign(
            new Error("Unparseable parcel or property number"),
            { field: "parcelNo" }
          )
        }
        const surveyId = resolveImportSurveyId(
          rawSurveyId,
          ward.number,
          parcelNo,
          propertyNo,
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

        if (existing) {
          const isSoftDeleted = existing.deletedAt != null
          if (job.duplicateStrategy === "SKIP" && !isSoftDeleted) {
            skipped++
            success++
            touchedSurveyIds.add(existing.id)
            wardIdsSeen.add(ward.id)
            continue
          }
          // UPDATE strategy, or soft-deleted row (must revive — surveyId is still unique).
          if (job.duplicateStrategy === "UPDATE" || isSoftDeleted) {
            const beforeAudit = surveyToAuditSnapshot(
              existing as unknown as Record<string, unknown>
            )
            const proposedAudit = surveyToAuditSnapshot({
              ...(existing as unknown as Record<string, unknown>),
              ...payload,
              deletedAt: null,
              status: "ACTIVE",
            })
            const proposedDiff = diffSurveyChanges(beforeAudit, proposedAudit)
            if (proposedDiff.changes.length === 0 && !isSoftDeleted) {
              // No mapped field changes — skip write but keep row touched for prune.
              success++
              touchedSurveyIds.add(existing.id)
              wardIdsSeen.add(ward.id)
              continue
            }

            const updatedSurvey = await this.prisma.$transaction(async (tx) => {
              await tx.surveyFloor.deleteMany({
                where: { surveyId: existing.id },
              })
              return tx.survey.update({
                where: { id: existing.id },
                data: {
                  ...payload,
                  deletedAt: null,
                  status: "ACTIVE",
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
                  revived: isSoftDeleted,
                } as Prisma.InputJsonValue,
              })
            }
            updated++
            success++
            touchedSurveyIds.add(existing.id)
            wardIdsSeen.add(ward.id)
            continue
          }
        }

        try {
          const created = await this.prisma.survey.create({
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
          touchedSurveyIds.add(created.id)
          wardIdsSeen.add(ward.id)
        } catch (createErr) {
          // Race / leftover soft-delete: unique surveyId — revive that row instead.
          if (
            createErr instanceof Prisma.PrismaClientKnownRequestError &&
            createErr.code === "P2002"
          ) {
            const conflict = await this.prisma.survey.findUnique({
              where: { surveyId },
            })
            if (conflict) {
              await this.prisma.$transaction(async (tx) => {
                await tx.surveyFloor.deleteMany({
                  where: { surveyId: conflict.id },
                })
                await tx.survey.update({
                  where: { id: conflict.id },
                  data: {
                    ...payload,
                    deletedAt: null,
                    status: "ACTIVE",
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
              updated++
              success++
              touchedSurveyIds.add(conflict.id)
              wardIdsSeen.add(ward.id)
              continue
            }
          }
          throw createErr
        }
      } catch (err) {
        failed++
        const field =
          err &&
          typeof err === "object" &&
          "field" in err &&
          typeof (err as { field?: unknown }).field === "string"
            ? (err as { field: string }).field
            : inferImportErrorField(err)
        await this.prisma.importError.create({
          data: {
            importJobId: job.id,
            rowNumber,
            surveyId: rawSurveyId || null,
            field,
            message: formatImportErrorMessage(err),
            severity: "error",
            rawRow: rawRowSnapshot as Prisma.InputJsonValue,
          },
        })
      }
    }

    const reconcileWardId = shouldReconcileWardAfterImport({
      duplicateStrategy: job.duplicateStrategy,
      failedRows: failed,
      wardIdsSeen,
      touchedSurveyIds,
      pruneMissing,
    })
    if (reconcileWardId) {
      pruned = await this.reconcileWardOrphans({
        wardId: reconcileWardId,
        keepSurveyIds: touchedSurveyIds,
        importJobId: job.id,
        actorId: job.createdById,
      })
      if (pruned > 0) {
        this.logger.log(
          `Import ${job.id}: soft-deleted ${pruned} orphan survey(s) in ward ${reconcileWardId} not present in file`
        )
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
        warningRows: pruned,
        completedAt: new Date(),
      },
    })
  }

  private async loadSurveySheet(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.getWorksheet("Survey Data")
    if (!sheet) {
      throw new BadRequestException({
        code: "SHEET_MISSING",
        message: 'Workbook must include a sheet named "Survey Data"',
      })
    }
    const columnCount = Math.max(sheet.columnCount, 1)
    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    for (let col = 1; col <= columnCount; col++) {
      headers[col - 1] = cell([headerRow.getCell(col).value], 0)
    }
    const detected = tryDetectPresetFromHeaders(headers, columnCount)
    if (!detected) {
      throw new BadRequestException({
        code: "UNKNOWN_HEADER_PRESET",
        message: "Could not detect a supported Chhata survey header layout",
      })
    }
    // Always resolve from file headers (stale presets can shift Floors → Road Type).
    const { preset, map } = resolveColumnMap(headers, columnCount)
    return { workbook, sheet, headers, columnCount, map, preset }
  }

  private readRowValues(excelRow: ExcelJS.Row, columnCount: number): unknown[] {
    const values: unknown[] = []
    for (let col = 1; col <= columnCount; col++) {
      values[col - 1] = excelRow.getCell(col).value
    }
    return values
  }

  /**
   * Soft-delete surveys in a ward that were not touched by a successful
   * single-ward UPDATE import (file is source of truth for that ward).
   */
  private async reconcileWardOrphans(input: {
    wardId: string
    keepSurveyIds: ReadonlySet<string>
    importJobId: string
    actorId: string | null
  }): Promise<number> {
    const orphans = await this.prisma.survey.findMany({
      where: orphanSurveyWhere(input.wardId, input.keepSurveyIds),
      select: { id: true, surveyId: true },
    })
    if (orphans.length === 0) return 0

    if (!shouldPruneOrphanCount(orphans.length, input.keepSurveyIds.size)) {
      this.logger.warn(
        `Import ${input.importJobId}: skipped reconcile for ward ${input.wardId} — ${orphans.length} orphan(s) exceeds safe prune cap (kept ${input.keepSurveyIds.size}). Re-upload the full ward file or prune manually.`
      )
      return 0
    }

    const now = new Date()
    await this.prisma.survey.updateMany({
      where: { id: { in: orphans.map((o) => o.id) } },
      data: { status: "DELETED", deletedAt: now },
    })

    for (const orphan of orphans) {
      await this.audit.log({
        action: "SURVEY_DELETED",
        entity: "Survey",
        entityId: orphan.id,
        actorId: input.actorId ?? undefined,
        oldValue: {
          surveyId: orphan.surveyId,
          source: "import-reconcile",
          importJobId: input.importJobId,
        } as Prisma.InputJsonValue,
      })
    }

    return orphans.length
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
    // Include soft-deleted: surveyId is globally unique and create would P2002.
    if (byCanonical) return byCanonical

    if (input.rawSurveyId !== input.surveyId) {
      const byRaw = await this.prisma.survey.findUnique({
        where: { surveyId: input.rawSurveyId },
      })
      if (byRaw) return byRaw
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

/** Short, actionable import error text (avoid dumping full Prisma invoke stacks). */
function formatImportErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(", ")
        : String(err.meta?.target ?? "unique field")
      return `Duplicate value for ${target}. Another survey already uses this Survey Id / identity.`
    }
    if (err.code === "P2003") {
      return "Related record missing (foreign key). Check ward / reference data."
    }
    return `Database error ${err.code}: ${err.message.split("\n")[0] ?? err.message}`
  }
  if (err instanceof Error) {
    const first = err.message.split("\n")[0]?.trim()
    return first && first.length > 0 ? first : "Import row failed"
  }
  return "Import row failed"
}

function inferImportErrorField(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return "surveyId"
    return "database"
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes("ward")) return "wardName"
    if (msg.includes("parcel") || msg.includes("property")) return "parcelNo"
  }
  return null
}
