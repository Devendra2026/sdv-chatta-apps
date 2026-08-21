import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { DuplicateStrategy, ImportJobStatus } from "@prisma/client"
import ExcelJS from "exceljs"
import { Queue } from "bullmq"
import IORedis from "ioredis"

import type { AuthUser } from "../auth/auth.decorators"
import { PrismaService } from "../prisma/prisma.service"
import { StorageService } from "../storage/storage.service"
import { computeDataQuality, parseFloorsRaw } from "../surveys/floors.util"
import {
  cell,
  detectPreset,
  extractWardNumber,
  getMapping,
  parseBool,
  parseNumber,
  parseSurveyedAt,
  type MappingPreset,
} from "./column-maps"

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name)
  private queue: Queue | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {
    try {
      const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: null,
      })
      this.queue = new Queue("survey-import", { connection })
    } catch (err) {
      this.logger.warn(`BullMQ queue unavailable: ${String(err)}`)
    }
  }

  async createUpload(
    file: Express.Multer.File,
    user: AuthUser,
    duplicateStrategy: DuplicateStrategy = "SKIP"
  ) {
    const objectKey = `imports/${Date.now()}-${file.originalname}`
    await this.storage.putObject(objectKey, file.buffer, file.mimetype)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer)
    const sheet =
      workbook.getWorksheet("Survey Data") ?? workbook.worksheets[0]
    const headerRow = sheet?.getRow(1)
    const columnCount = headerRow?.cellCount ?? 0
    const mappingPreset = detectPreset(columnCount)

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

  async list(page = 1, pageSize = 20) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.importJob.count(),
      this.prisma.importJob.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ])
    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  }

  async processJob(jobId: string) {
    const job = await this.prisma.importJob.findUniqueOrThrow({ where: { id: jobId } })
    if (!job.objectKey) throw new Error("Missing object key")

    const buffer = await this.storage.getObject(job.objectKey)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.getWorksheet("Survey Data") ?? workbook.worksheets[0]
    if (!sheet) throw new Error("Sheet not found")

    const preset = (job.mappingPreset as MappingPreset) || "chhata-v2-55"
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
      excelRow.eachCell({ includeEmpty: true }, (cellValue, col) => {
        values[col - 1] = cellValue.value
      })

      const surveyId = cell(values, map.surveyId)
      if (!surveyId) continue
      processed++

      try {
        const wardName = cell(values, map.wardName)
        const wardNumber = extractWardNumber(wardName, surveyId)
        const ward = wardNumber ? wardByNumber.get(wardNumber) : undefined
        if (!ward) {
          throw new Error(`Ward not found for ${wardName || surveyId}`)
        }

        const mobile = cell(values, map.mobile)
        const floorsRaw =
          "floorsRaw" in map ? cell(values, (map as typeof map & { floorsRaw: number }).floorsRaw) : ""
        const floors = parseFloorsRaw(floorsRaw)
        const plotAreaSqFt =
          "plotAreaSqFt" in map
            ? parseNumber(cell(values, (map as { plotAreaSqFt: number }).plotAreaSqFt))
            : undefined
        const totalBuiltUpAreaSqFt =
          "totalBuiltUpAreaSqFt" in map
            ? parseNumber(
                cell(values, (map as { totalBuiltUpAreaSqFt: number }).totalBuiltUpAreaSqFt)
              )
            : undefined

        const payload = {
          surveyId,
          wardId: ward.id,
          surveyedAt: parseSurveyedAt(cell(values, map.surveyedAt)),
          ownerName: cell(values, map.ownerName) || null,
          ownerFatherName: cell(values, map.ownerFatherName) || null,
          mobile: mobile || null,
          isSlum: parseBool(cell(values, map.isSlum)) ?? false,
          remark: cell(values, map.remark) || null,
          parcelNo: cell(values, map.parcelNo) || null,
          propertyNo: cell(values, map.propertyNo) || null,
          electricityId: cell(values, map.electricityId) || null,
          khasraNo: cell(values, map.khasraNo) || null,
          registryNo: cell(values, map.registryNo) || null,
          constructedDate: cell(values, map.constructedDate) || null,
          respondentName: cell(values, map.respondentName) || null,
          respondentRelationship: cell(values, map.respondentRelationship) || null,
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
          totalBuiltUpAreaSqFt,
          hasMunicipalWaterSupply:
            "hasMunicipalWaterSupply" in map
              ? parseBool(
                  cell(values, (map as { hasMunicipalWaterSupply: number }).hasMunicipalWaterSupply)
                )
              : undefined,
          hasAlternateWater:
            "hasAlternateWater" in map
              ? parseBool(cell(values, (map as { hasAlternateWater: number }).hasAlternateWater))
              : undefined,
          waterSourceType:
            "waterSourceType" in map
              ? cell(values, (map as { waterSourceType: number }).waterSourceType) || null
              : null,
          totalWaterConnections:
            "totalWaterConnections" in map
              ? parseNumber(
                  cell(values, (map as { totalWaterConnections: number }).totalWaterConnections)
                )
              : undefined,
          waterConnectionIdType:
            "waterConnectionIdType" in map
              ? cell(values, (map as { waterConnectionIdType: number }).waterConnectionIdType) ||
                null
              : null,
          toiletType:
            "toiletType" in map
              ? cell(values, (map as { toiletType: number }).toiletType) || null
              : null,
          hasMunicipalWasteService:
            "hasMunicipalWasteService" in map
              ? parseBool(
                  cell(values, (map as { hasMunicipalWasteService: number }).hasMunicipalWasteService)
                )
              : undefined,
          ownerAadhaar:
            "ownerAadhaar" in map
              ? cell(values, (map as { ownerAadhaar: number }).ownerAadhaar) || null
              : null,
          dataQualityStatus: computeDataQuality({
            mobile,
            propertyNo: cell(values, map.propertyNo),
            parcelNo: cell(values, map.parcelNo),
            plotAreaSqFt,
            totalBuiltUpAreaSqFt,
          }),
          importJobId: job.id,
          status: "ACTIVE" as const,
        }

        const existing = await this.prisma.survey.findUnique({
          where: { surveyId },
        })

        if (existing && !existing.deletedAt) {
          if (job.duplicateStrategy === "SKIP") {
            skipped++
            success++
            continue
          }
          if (job.duplicateStrategy === "UPDATE") {
            await this.prisma.$transaction(async (tx) => {
              await tx.surveyFloor.deleteMany({ where: { surveyId: existing.id } })
              await tx.survey.update({
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
            surveyId: surveyId || null,
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

  async exportSurveys(filters: { wardId?: string; status?: string }, user: AuthUser) {
    const surveys = await this.prisma.survey.findMany({
      where: {
        deletedAt: null,
        status: filters.status ? (filters.status as never) : { not: "DELETED" },
        ...(filters.wardId ? { wardId: filters.wardId } : {}),
      },
      include: { ward: true, floors: true },
      take: 50000,
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Survey Data")
    sheet.addRow([
      "Survey ID",
      "Surveyed At",
      "Ward",
      "Owner Name",
      "Mobile",
      "Parcel No",
      "Property No",
      "Locality",
      "Property Use",
      "Floors",
      "Plot Area SqFt",
      "Status",
    ])
    for (const s of surveys) {
      sheet.addRow([
        s.surveyId,
        s.surveyedAt?.toISOString() ?? "",
        s.ward.name,
        s.ownerName,
        s.mobile,
        s.parcelNo,
        s.propertyNo,
        s.locality,
        s.propertyUse,
        s.floorsRaw,
        s.plotAreaSqFt?.toString(),
        s.status,
      ])
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const fileName = `survey-export-${Date.now()}.xlsx`
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
