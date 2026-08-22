/**
 * Re-process an import job with UPDATE strategy (no Nest bootstrap).
 *
 * Usage: pnpm --filter api exec tsx scripts/repair-import-standalone.ts <jobId>
 */
import "dotenv/config"

import { DuplicateStrategy, PrismaClient } from "@prisma/client"
import ExcelJS from "exceljs"
import * as Minio from "minio"

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
} from "../src/imports/column-maps"
import { computeDataQuality, parseFloorsRaw } from "../src/surveys/floors.util"

const prisma = new PrismaClient()

function storageClient() {
  return new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? 9010),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  })
}

async function getObject(key: string): Promise<Buffer> {
  const client = storageClient()
  const bucket = process.env.MINIO_BUCKET ?? "chhata-surveys"
  const stream = await client.getObject(bucket, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function main() {
  const jobId = process.argv[2]
  if (!jobId) {
    console.error("Usage: tsx scripts/repair-import-standalone.ts <importJobId>")
    process.exit(1)
  }

  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } })
  if (!job.objectKey) throw new Error("Import job has no objectKey")

  const buffer = await getObject(job.objectKey)
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
  const wards = await prisma.ward.findMany()
  const wardByNumber = new Map(wards.map((w) => [w.number, w]))

  let updated = 0
  let failed = 0
  let skipped = 0

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const excelRow = sheet.getRow(rowNumber)
    const values: unknown[] = []
    for (let col = 1; col <= columnCount; col++) {
      values[col - 1] = excelRow.getCell(col).value
    }

    const surveyId = cell(values, map.surveyId)
    if (!surveyId) continue

    try {
      const wardName = cell(values, map.wardName)
      const wardNumber = extractWardNumber(wardName, surveyId)
      const ward = wardNumber ? wardByNumber.get(wardNumber) : undefined
      if (!ward) throw new Error(`Ward not found for ${wardName || surveyId}`)

      const mobileRaw = cell(values, map.mobile)
      const mobile = !mobileRaw || mobileRaw === "0" ? "" : mobileRaw
      const floorsRaw = cell(values, map.floorsRaw)
      const floors = parseFloorsRaw(floorsRaw)
      const parcelNo = normalizeParcelNo(cell(values, map.parcelNo), surveyId)
      const propertyNo = normalizePropertyNo(cell(values, map.propertyNo), surveyId)

      const payload = {
        wardId: ward.id,
        surveyedAt: parseSurveyedAt(cell(values, map.surveyedAt)),
        ownerName: cell(values, map.ownerName) || null,
        ownerFatherName: cell(values, map.ownerFatherName) || null,
        mobile: mobile || null,
        isSlum: parseBool(cell(values, map.isSlum)) ?? false,
        remark: cell(values, map.remark) || null,
        parcelNo,
        propertyNo,
        respondentName: cell(values, map.respondentName) || null,
        respondentRelationship: cell(values, map.respondentRelationship) || null,
        city: cell(values, map.city) || null,
        pincode: cell(values, map.pincode) || null,
        houseNo: cell(values, map.houseNo) || null,
        streetName: cell(values, map.streetName) || null,
        locality: cell(values, map.locality) || null,
        colony: cell(values, map.colony) || null,
        taxRateZone: cell(values, map.taxRateZone) || null,
        propertyOwnership: cell(values, map.propertyOwnership) || null,
        propertyUse: cell(values, map.propertyUse) || null,
        commercial: cell(values, map.commercial) || null,
        yearOfConstruction: cell(values, map.yearOfConstruction) || null,
        situation: cell(values, map.situation) || null,
        roadType: cell(values, map.roadType) || null,
        floorsRaw: floorsRaw || null,
        plotAreaSqFt: parseNumber(cell(values, map.plotAreaSqFt)),
        plotAreaSqMeter: parseNumber(cell(values, map.plotAreaSqMeter)),
        plinthAreaSqFt: parseNumber(cell(values, map.plinthAreaSqFt)),
        plinthAreaSqMeter: parseNumber(cell(values, map.plinthAreaSqMeter)),
        totalBuiltUpAreaSqFt: parseNumber(cell(values, map.totalBuiltUpAreaSqFt)),
        totalBuiltUpAreaSqMeter: parseNumber(
          cell(values, map.totalBuiltUpAreaSqMeter)
        ),
        hasMunicipalWaterSupply: parseBool(cell(values, map.hasMunicipalWaterSupply)),
        hasAlternateWater: parseBool(cell(values, map.hasAlternateWater)),
        waterSourceType: cell(values, map.waterSourceType) || null,
        totalWaterConnections: parseNumber(cell(values, map.totalWaterConnections)),
        waterConnectionIdType: cell(values, map.waterConnectionIdType) || null,
        toiletType: cell(values, map.toiletType) || null,
        hasMunicipalWasteService: parseBool(cell(values, map.hasMunicipalWasteService)),
        dataQualityStatus: computeDataQuality({
          mobile,
          propertyNo,
          parcelNo,
          plotAreaSqFt: parseNumber(cell(values, map.plotAreaSqFt)),
          totalBuiltUpAreaSqFt: parseNumber(cell(values, map.totalBuiltUpAreaSqFt)),
        }),
        status: "ACTIVE" as const,
      }

      const existing = await prisma.survey.findUnique({ where: { surveyId } })
      if (!existing || existing.deletedAt) {
        skipped++
        continue
      }

      await prisma.$transaction(async (tx) => {
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
    } catch (err) {
      failed++
      console.error(`Row ${rowNumber} (${surveyId}):`, err)
    }
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      duplicateStrategy: DuplicateStrategy.UPDATE,
      status: failed === 0 ? "COMPLETED" : "PARTIAL",
      updatedRows: updated,
      skippedRows: skipped,
      failedRows: failed,
      completedAt: new Date(),
    },
  })

  console.log("Repair complete:", { preset, updated, skipped, failed })
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
