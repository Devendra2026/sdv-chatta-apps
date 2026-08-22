import path from "path"

import ExcelJS from "exceljs"

import { cell, getMapping, parseBool, parseSurveyedAt } from "./column-maps"
import {
  buildSurveyExportWorkbook,
  CHHATA_V1_HEADERS,
  CHHATA_V2_HEADERS,
  detectExportPreset,
  getExportHeaders,
  SURVEY_EXPORT_SHEET_NAME,
  surveyToExcelRow,
  type SurveyExportRecord,
} from "./survey-excel-export"

const FIXTURES = path.join(__dirname, "../../../../fixtures/survey")

async function loadFixture(fileName: string) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path.join(FIXTURES, fileName))
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error(`Sheet not found in ${fileName}`)
  const headers: string[] = []
  sheet.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
    headers[col - 1] = String(c.value ?? "")
  })
  const row2: unknown[] = []
  for (let col = 1; col <= sheet.columnCount; col++) {
    row2[col - 1] = sheet.getRow(2).getCell(col).value
  }
  return { headers, row2, sheet }
}

describe("survey-excel-export", () => {
  it("detects export preset from ward number", () => {
    expect(detectExportPreset(1)).toBe("chhata-v1-38")
    expect(detectExportPreset(2)).toBe("chhata-v2-55")
    expect(detectExportPreset(undefined)).toBe("chhata-v2-55")
  })

  it("matches Ward 1 and Ward 2 fixture headers", async () => {
    const w1 = await loadFixture("Ward 1.xlsx")
    const w2 = await loadFixture("Ward 2.xlsx")

    expect([...CHHATA_V1_HEADERS]).toEqual(w1.headers)
    expect([...CHHATA_V2_HEADERS]).toEqual(w2.headers)
    expect(getExportHeaders("chhata-v1-38")).toEqual(w1.headers)
    expect(getExportHeaders("chhata-v2-55")).toEqual(w2.headers)
  })

  it("exports Ward 1 fixture row values at mapped columns", async () => {
    const { row2 } = await loadFixture("Ward 1.xlsx")
    const map = getMapping("chhata-v1-38")
    const surveyedAt = parseSurveyedAt(cell(row2, map.surveyedAt)) ?? null

    const survey: SurveyExportRecord = {
      surveyId: cell(row2, map.surveyId),
      surveyedAt,
      ownerName: cell(row2, map.ownerName),
      ownerFatherName: cell(row2, map.ownerFatherName),
      mobile: cell(row2, map.mobile),
      ownerAadhaar: null,
      isSlum: parseBool(cell(row2, map.isSlum)) ?? false,
      remark: null,
      parcelNo: "000001",
      propertyNo: "001",
      electricityId: null,
      khasraNo: null,
      registryNo: null,
      constructedDate: null,
      respondentName: cell(row2, map.respondentName),
      respondentRelationship: cell(row2, map.respondentRelationship),
      city: cell(row2, map.city),
      pincode: cell(row2, map.pincode),
      houseNo: cell(row2, map.houseNo),
      streetName: cell(row2, map.streetName),
      locality: cell(row2, map.locality),
      colony: cell(row2, map.colony),
      presentHouseNo: null,
      presentStreetName: null,
      presentLocality: null,
      presentColony: null,
      presentCity: null,
      presentPincode: null,
      isSameAsProperty: null,
      taxRateZone: cell(row2, map.taxRateZone),
      propertyOwnership: cell(row2, map.propertyOwnership),
      propertyUse: cell(row2, map.propertyUse),
      commercial: cell(row2, map.commercial),
      yearOfConstruction: cell(row2, map.yearOfConstruction),
      exemptionType: null,
      exemptionApplicable: null,
      situation: cell(row2, map.situation),
      roadType: cell(row2, map.roadType),
      floorsRaw: cell(row2, map.floorsRaw),
      plotAreaSqFt: null,
      plotAreaSqMeter: null,
      plinthAreaSqFt: null,
      plinthAreaSqMeter: null,
      totalBuiltUpAreaSqFt: null,
      totalBuiltUpAreaSqMeter: null,
      hasMunicipalWaterSupply:
        parseBool(cell(row2, map.hasMunicipalWaterSupply)) ?? null,
      hasAlternateWater: parseBool(cell(row2, map.hasAlternateWater)) ?? null,
      waterSourceType: cell(row2, map.waterSourceType),
      totalWaterConnections: null,
      waterConnectionIdType: cell(row2, map.waterConnectionIdType),
      toiletType: cell(row2, map.toiletType),
      hasMunicipalWasteService:
        parseBool(cell(row2, map.hasMunicipalWasteService)) ?? null,
      ward: { name: cell(row2, map.wardName), number: 1 },
    }

    const exported = surveyToExcelRow(survey, "chhata-v1-38")

    expect(exported[map.surveyId]).toBe(cell(row2, map.surveyId))
    expect(exported[map.ownerName]).toBe("Vijay singh")
    expect(exported[map.surveyedAt]).toBe(cell(row2, map.surveyedAt))
    expect(exported[map.hasAlternateWater!]).toBe("Yes")
    expect(exported[map.waterSourceType!]).toBe("Dug well")
    expect(exported[map.toiletType]).toBe("Connected to specific tank")
  })

  it("builds workbook with Survey Data sheet name", async () => {
    const workbook = buildSurveyExportWorkbook([], "chhata-v1-38")
    expect(workbook.worksheets[0]?.name).toBe(SURVEY_EXPORT_SHEET_NAME)
    expect(workbook.worksheets[0]?.rowCount).toBe(1)
  })
})
