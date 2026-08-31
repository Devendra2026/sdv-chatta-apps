import path from "path"

import ExcelJS from "exceljs"

import {
  CHHATA_V1_38,
  CHHATA_V2_55,
  cell,
  detectPreset,
  detectPresetFromHeaders,
  extractWardNumber,
  getMapping,
  normalizeParcelNo,
  parseBool,
  parseNumber,
  parseSurveyedAt,
} from "./column-maps"

const FIXTURES = path.join(__dirname, "../../../../fixtures/survey")

describe("column-maps", () => {
  it("detects presets by column count", () => {
    expect(detectPreset(38)).toBe("chhata-v1-38")
    expect(detectPreset(55)).toBe("chhata-v2-55")
  })

  it("detects presets from Excel headers", () => {
    expect(detectPresetFromHeaders(["Survey Id", "Date of Survey"])).toBe(
      "chhata-v1-38"
    )
    expect(detectPresetFromHeaders(["SN", "Actions", "Survey Id"])).toBe(
      "chhata-v2-55"
    )
    expect(detectPresetFromHeaders(["S.No", "Actions"])).toBe("chhata-v2-55")
  })

  it("extracts ward numbers from Hindi names and GIS ids", () => {
    expect(extractWardNumber("वार्ड नंबर 2 - शेरगढ रोड़", "")).toBe(2)
    expect(extractWardNumber("", "249044-001-000001-001-R")).toBe(1)
    expect(extractWardNumber("Vijay singh", "249044-001-000001-001-R")).toBe(1)
    expect(extractWardNumber("वार्ड नंबर 2 - शेरगढ रोड़", "249044-000-000232-006-C")).toBe(2)
    expect(extractWardNumber("", "249044-000-000232-006-C")).toBeNull()
  })

  it("parses sentinels safely", () => {
    expect(parseBool("N/A")).toBeUndefined()
    expect(parseBool("Yes")).toBe(true)
    expect(parseNumber("1,200.5")).toBe(1200.5)
    expect(parseNumber("null")).toBeUndefined()
    expect(cell(["N/A"], 0)).toBe("")
    expect(cell([0], 0)).toBe("0")
  })

  it("parses GIS survey dates and pads parcel from Survey Id", () => {
    const surveyed = parseSurveyedAt("16 June 2025 at 05:46:13 pm")
    expect(surveyed?.getFullYear()).toBe(2025)
    expect(surveyed?.getMonth()).toBe(5)
    expect(normalizeParcelNo("1", "249044-001-000008-001-R")).toBe("000008")
  })

  it("maps Ward 1 fixture columns to v1 indexes", async () => {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(path.join(FIXTURES, "Ward 1.xlsx"))
    const sheet = workbook.worksheets[0]
    const headers: string[] = []
    sheet.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
      headers[col - 1] = String(c.value ?? "")
    })
    expect(detectPresetFromHeaders(headers, sheet.columnCount)).toBe(
      "chhata-v1-38"
    )
    const map = getMapping("chhata-v1-38")
    expect(headers[map.surveyId].toLowerCase()).toContain("survey")
    expect(headers[map.ownerName].toLowerCase()).toContain("owner name")
    expect(headers[map.wardName].toLowerCase()).toContain("ward")
    expect(headers[map.parcelNo].toLowerCase()).toContain("parcel")
    expect(map).toEqual(CHHATA_V1_38)

    const values: unknown[] = []
    for (let col = 1; col <= sheet.columnCount; col++) {
      values[col - 1] = sheet.getRow(2).getCell(col).value
    }
    expect(cell(values, map.surveyId)).toMatch(/^\d+-\d{3}-\d+-/)
    expect(cell(values, map.ownerName)).toBe("Vijay singh")
    expect(normalizeParcelNo(cell(values, map.parcelNo), cell(values, map.surveyId))).toBe(
      "000001"
    )
    expect(parseBool(cell(values, map.hasMunicipalWaterSupply))).toBe(false)
    expect(parseBool(cell(values, map.hasAlternateWater))).toBe(true)
    expect(cell(values, map.waterSourceType)).toBe("Dug well")
    expect(cell(values, map.toiletType)).toBe("Connected to specific tank")
  })

  it("maps Ward 2 fixture columns to v2 indexes", async () => {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(path.join(FIXTURES, "Ward 2.xlsx"))
    const sheet = workbook.worksheets[0]
    const headers: string[] = []
    sheet.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
      headers[col - 1] = String(c.value ?? "")
    })
    expect(detectPresetFromHeaders(headers, sheet.columnCount)).toBe(
      "chhata-v2-55"
    )
    const map = getMapping("chhata-v2-55")
    expect(headers[map.surveyId].toLowerCase()).toContain("survey")
    expect(headers[map.parcelNo].toLowerCase()).toContain("parcel")
    expect(headers[map.ownerAadhaar ?? -1]?.toLowerCase()).toContain("aadhaar")
    expect(map.surveyId).toBe(CHHATA_V2_55.surveyId)
    expect(map.parcelNo).toBe(10)

    const values: unknown[] = []
    for (let col = 1; col <= sheet.columnCount; col++) {
      values[col - 1] = sheet.getRow(2).getCell(col).value
    }
    expect(cell(values, map.surveyId)).toBe("249044-002-000001-001-C")
    expect(cell(values, 0)).toBe("1442")
    expect(
      normalizeParcelNo(cell(values, map.parcelNo), cell(values, map.surveyId))
    ).toBe("000001")
  })
})
