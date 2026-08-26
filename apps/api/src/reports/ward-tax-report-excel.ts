import ExcelJS from "exceljs"

import type { SurveyExportRecord } from "../imports/survey-excel-export"
import {
  computeSurveyExportTax,
  type ExportTaxRateTable,
  toTaxNumber,
} from "../tax/tax-calc"
import {
  isResidentialUsage,
  mapConstructionCode,
  mapTaxRateZoneCode,
} from "../tax/tax-zone-map"

export const WARD_TAX_REPORT_SHEET = "Survey Data"
export const WARD_TAX_COLUMN_COUNT = 48

function padHeaderRow(cells: readonly string[]): readonly string[] {
  const row = [...cells]
  while (row.length < WARD_TAX_COLUMN_COUNT) row.push("")
  return row.slice(0, WARD_TAX_COLUMN_COUNT)
}

/** Header rows 2–5 (row 1 is ward banner). */
export const WARD_TAX_HEADER_ROWS: readonly (readonly string[])[] = [
  padHeaderRow([
    "S N",
    "Survey Id",
    "Owner Name",
    "Owner Father Name",
    "Mobile No",
    "Parcel No",
    "Property No",
    "City",
    "Pincode",
    "House No",
    "Colony",
    "Tax Rate Zone",
    "Property Use",
    "Road Type",
    "Floors",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Plot Area SqFt",
    "Plinth Area SqFt",
    "Total Built Up Area SqFt",
    "Total Demand",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]),
  padHeaderRow([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Floor",
    "Basement",
    "",
    "Ground Floor",
    "",
    "First Floor",
    "",
    "Second Floor",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]),
  padHeaderRow([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Residential",
    "Non-Residential",
    "Residential",
    "Non-Residential",
    "Residential",
    "Non-Residential",
    "Residential",
    "Non-Residential",
    "",
    "",
    "",
    "Residential",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Non-Residential",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Open Land",
    "",
    "",
    "",
    "Total Tax",
  ]),
  padHeaderRow([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "RCC",
    "T.Rate",
    "Tax",
    "TEEN",
    "T.Rate",
    "Tax",
    "KACCHA",
    "T.Rate",
    "Tax",
    "RCC",
    "T.Rate",
    "Tax",
    "TEEN",
    "T.Rate",
    "Tax",
    "KACCHA",
    "T.Rate",
    "Tax",
    "Plot Area",
    "Plot T.Rete",
    "Plot Tax",
    "",
  ]),
]

type SurveyWithFloors = SurveyExportRecord & {
  floors?: Array<{
    floorLabel: string
    areaSqFt?: { toString(): string } | null
    usageType?: string | null
    usageFactor?: string | null
    buildingType?: string | null
  }>
  hasMunicipalWaterSupply?: boolean | null
}

function floorsAbbrev(raw?: string | null): string {
  if (!raw?.trim()) return ""
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return raw.slice(0, 1).toUpperCase()
  return parts
    .map((p) => {
      const m = p.match(/^(.+?)\s*-/i)
      return (m?.[1]?.trim()?.[0] ?? p[0] ?? "").toUpperCase()
    })
    .join("")
}

export function buildWardTaxReportWorkbook(input: {
  wardName: string
  surveys: SurveyWithFloors[]
  rates: ExportTaxRateTable
}): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(WARD_TAX_REPORT_SHEET)

  const banner = new Array<string>(WARD_TAX_COLUMN_COUNT).fill("")
  banner[0] = input.wardName
  sheet.addRow(banner)

  for (const headerRow of WARD_TAX_HEADER_ROWS) {
    sheet.addRow([...headerRow])
  }

  input.surveys.forEach((survey, index) => {
    sheet.addRow(buildWardTaxDataRow(survey, index + 1, input.rates))
  })

  return workbook
}

export function buildWardTaxDataRow(
  survey: SurveyWithFloors,
  sn: number,
  rates: ExportTaxRateTable
): unknown[] {
  const row: unknown[] = new Array(WARD_TAX_COLUMN_COUNT).fill("")

  row[0] = sn
  row[1] = survey.surveyId
  row[2] = survey.ownerName ?? ""
  row[3] = survey.ownerFatherName ?? ""
  row[4] = survey.mobile ?? 0
  row[5] = survey.parcelNo ?? ""
  row[6] = survey.propertyNo ?? ""
  row[7] = survey.city ?? ""
  row[8] = survey.pincode ?? ""
  row[9] = survey.houseNo ?? ""
  row[10] = survey.colony ?? ""
  row[11] = survey.taxRateZone ?? ""
  row[12] = survey.propertyUse ?? ""
  row[13] = survey.roadType ?? ""
  row[14] = floorsAbbrev(survey.floorsRaw)

  const zoneCode = mapTaxRateZoneCode(survey.taxRateZone) ?? "BELOW_9M"

  const floorInputs = (survey.floors ?? []).map((f) => ({
    floorKey: f.floorLabel,
    constructionCode: mapConstructionCode(f.buildingType ?? f.usageType),
    usageResidential: isResidentialUsage(f.usageType, survey.propertyUse),
    areaSqFt: toTaxNumber(f.areaSqFt),
    usageType: f.usageType,
    usageFactor: f.usageFactor,
  }))

  const tax = computeSurveyExportTax({
    taxRateZoneCode: zoneCode,
    propertyUse: survey.propertyUse,
    hasMunicipalWater: survey.hasMunicipalWaterSupply,
    floors: floorInputs,
    plotAreaSqFt: toTaxNumber(survey.plotAreaSqFt),
    plinthAreaSqFt: toTaxNumber(survey.plinthAreaSqFt),
    totalBuiltUpAreaSqFt: toTaxNumber(survey.totalBuiltUpAreaSqFt),
    rates,
  })

  for (let i = 0; i < 8; i++) {
    row[15 + i] = tax.floorAreaBySlot[i] || 0
  }

  row[23] = toTaxNumber(survey.plotAreaSqFt)
  row[24] = toTaxNumber(survey.plinthAreaSqFt)
  row[25] = toTaxNumber(survey.totalBuiltUpAreaSqFt)

  for (let i = 0; i < 9; i++) {
    row[26 + i] = tax.residentialTaxCells[i] ?? "-"
  }
  for (let i = 0; i < 9; i++) {
    row[35 + i] = tax.nonResidentialTaxCells[i] ?? "-"
  }

  row[44] =
    toTaxNumber(survey.plotAreaSqFt) ||
    tax.floorAreaBySlot.reduce((a, b) => a + b, 0)
  row[45] = tax.plotRate
  row[46] = tax.plotTax
  row[47] = tax.totalDemand

  return row
}

export function taxConfigToRateTable(config: {
  assessablePct: { toString(): string }
  commercialAssessablePct?: { toString(): string } | null
  propertyTaxPct: { toString(): string }
  waterTaxPct: { toString(): string }
  drainageTaxPct: { toString(): string }
  penaltyPct: { toString(): string }
  cells: Array<{
    roadWidthEntry: { code: string }
    constructionEntry: { code: string }
    annualRatePerSqFt: { toString(): string }
  }>
}): ExportTaxRateTable {
  const rateByZoneAndConstruction = new Map<string, number>()
  const anyRateByZone = new Map<string, number>()

  for (const cell of config.cells) {
    const key = `${cell.roadWidthEntry.code}::${cell.constructionEntry.code}`
    const rate = toTaxNumber(cell.annualRatePerSqFt)
    rateByZoneAndConstruction.set(key, rate)
    if (!anyRateByZone.has(cell.roadWidthEntry.code) && rate > 0) {
      anyRateByZone.set(cell.roadWidthEntry.code, rate)
    }
  }

  return {
    assessablePct: toTaxNumber(config.assessablePct),
    commercialAssessablePct: toTaxNumber(
      config.commercialAssessablePct ?? config.assessablePct
    ),
    propertyTaxPct: toTaxNumber(config.propertyTaxPct),
    waterTaxPct: toTaxNumber(config.waterTaxPct),
    drainageTaxPct: toTaxNumber(config.drainageTaxPct),
    penaltyPct: toTaxNumber(config.penaltyPct),
    rateByZoneAndConstruction,
    anyRateByZone,
  }
}
