import { Prisma } from "@prisma/client"
import ExcelJS from "exceljs"

import { type ColumnMap, type MappingPreset, getMapping } from "./column-maps"

export const SURVEY_EXPORT_SHEET_NAME = "Survey Data"

/** Ward 1 workbook headers (38 columns) — matches fixtures/survey/Ward 1.xlsx */
export const CHHATA_V1_HEADERS: readonly string[] = [
  "Survey Id",
  "Date of Survey",
  "Owner Name",
  "Owner Father Name",
  "Mobile No",
  "Ward Name",
  "Is Slum",
  "Parcel No",
  "Property No",
  "Respondent Name",
  "Respondent Relationship",
  "City",
  "Pincode",
  "House No",
  "Street Name",
  "Locality",
  "Colony",
  "Tax Rate Zone",
  "Property Ownership",
  "Property Use",
  "Commercial",
  "Year of Construction",
  "Situation",
  "Road Type",
  "Floors",
  "Plot Area SqFt",
  "Plot Area SqMeter",
  "Plinth Area SqFt",
  "Plinth Area SqMeter",
  "Total Built Up Area SqFt",
  "Total Built Up Area SqMeter",
  "Is Muncipal Water Supply",
  "Total Water Connection",
  "Water Connection Id/Type",
  "Toilet Type",
  "Is Muncipal Waste Service",
  "Is Muncipal Water Supply",
  "Is Muncipal Water Supply",
]

/** Ward 2+ workbook headers (55 columns) — matches fixtures/survey/Ward 2.xlsx */
export const CHHATA_V2_HEADERS: readonly string[] = [
  "SN",
  "Actions",
  "Survey Id",
  "Date of Survey",
  "Owner Name",
  "Owner Father Name",
  "Mobile No",
  "Ward Name",
  "Is Slum",
  "Remark",
  "Parcel No",
  "Property No",
  "Electricity ID",
  "Khasra No",
  "Registry No",
  "Constructed Date",
  "Respondent Name",
  "Respondent Relationship",
  "Owner Aadhaar Number",
  "City",
  "Pincode",
  "House No",
  "Street Name",
  "Locality",
  "Colony",
  "Present House No",
  "Present Street Name",
  "Present Locality",
  "Present Colony",
  "Present City",
  "Present Pincode",
  "Is Same As Property",
  "Tax Rate Zone",
  "Property Ownership",
  "Property Use",
  "Commercial",
  "Year of Construction",
  "Exemption Type",
  "Exemption Applicable",
  "Situation",
  "Road Type",
  "Floors",
  "Plot Area SqFt",
  "Plot Area SqMeter",
  "Plinth Area SqFt",
  "Plinth Area SqMeter",
  "Total Built Up Area SqFt",
  "Total Built Up Area SqMeter",
  "Is Muncipal Water Supply",
  "Total Water Connection",
  "Water Connection Id/Type",
  "Toilet Type",
  "Is Muncipal Waste Service",
  "Is Muncipal Water Supply",
  "Is Muncipal Water Supply",
]

/** v2 trailing duplicate headers map to alternate water fields (not in ColumnMap). */
const V2_ALTERNATE_WATER_COL = 53
const V2_WATER_SOURCE_COL = 54

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export type SurveyExportRecord = {
  surveyId: string
  surveyedAt: Date | null
  ownerName: string | null
  ownerFatherName: string | null
  mobile: string | null
  ownerAadhaar: string | null
  isSlum: boolean
  remark: string | null
  parcelNo: string | null
  propertyNo: string | null
  electricityId: string | null
  khasraNo: string | null
  registryNo: string | null
  constructedDate: string | null
  respondentName: string | null
  respondentRelationship: string | null
  city: string | null
  pincode: string | null
  houseNo: string | null
  streetName: string | null
  locality: string | null
  colony: string | null
  presentHouseNo: string | null
  presentStreetName: string | null
  presentLocality: string | null
  presentColony: string | null
  presentCity: string | null
  presentPincode: string | null
  isSameAsProperty: boolean | null
  taxRateZone: string | null
  propertyOwnership: string | null
  propertyUse: string | null
  commercial: string | null
  yearOfConstruction: string | null
  exemptionType: string | null
  exemptionApplicable: boolean | null
  situation: string | null
  roadType: string | null
  floorsRaw: string | null
  plotAreaSqFt: Prisma.Decimal | null
  plotAreaSqMeter: Prisma.Decimal | null
  plinthAreaSqFt: Prisma.Decimal | null
  plinthAreaSqMeter: Prisma.Decimal | null
  totalBuiltUpAreaSqFt: Prisma.Decimal | null
  totalBuiltUpAreaSqMeter: Prisma.Decimal | null
  hasMunicipalWaterSupply: boolean | null
  hasAlternateWater: boolean | null
  waterSourceType: string | null
  totalWaterConnections: number | null
  waterConnectionIdType: string | null
  toiletType: string | null
  hasMunicipalWasteService: boolean | null
  ward: { name: string; number: number }
}

export function detectExportPreset(wardNumber?: number): MappingPreset {
  return wardNumber === 1 ? "chhata-v1-38" : "chhata-v2-55"
}

export function getExportHeaders(preset: MappingPreset): readonly string[] {
  return preset === "chhata-v1-38" ? CHHATA_V1_HEADERS : CHHATA_V2_HEADERS
}

export function formatSurveyedAtForExcel(date: Date): string {
  const day = date.getDate()
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "pm" : "am"
  hours = hours % 12
  if (hours === 0) hours = 12
  const hourText = hours.toString().padStart(2, "0")
  return `${day} ${month} ${year} at ${hourText}:${minutes}:${seconds} ${ampm}`
}

export function formatBoolForExcel(value: boolean | null | undefined): string {
  if (value === true) return "Yes"
  if (value === false) return "No"
  return ""
}

export function formatDecimalForExcel(
  value: Prisma.Decimal | null | undefined
): string {
  if (value == null) return ""
  return value.toString()
}

function setCell(row: unknown[], index: number, value: unknown) {
  if (index < 0) return
  if (value === "" || value == null) return
  row[index] = value
}

function applyMappedFields(
  row: unknown[],
  map: ColumnMap,
  survey: SurveyExportRecord
) {
  setCell(row, map.surveyId, survey.surveyId)
  setCell(
    row,
    map.surveyedAt,
    survey.surveyedAt ? formatSurveyedAtForExcel(survey.surveyedAt) : ""
  )
  setCell(row, map.ownerName, survey.ownerName ?? "")
  setCell(row, map.ownerFatherName, survey.ownerFatherName ?? "")
  setCell(row, map.mobile, survey.mobile ?? "")
  setCell(row, map.wardName, survey.ward.name)
  setCell(row, map.isSlum, formatBoolForExcel(survey.isSlum))
  setCell(row, map.parcelNo, survey.parcelNo ?? "")
  setCell(row, map.propertyNo, survey.propertyNo ?? "")
  setCell(row, map.respondentName, survey.respondentName ?? "")
  setCell(row, map.respondentRelationship, survey.respondentRelationship ?? "")
  setCell(row, map.city, survey.city ?? "")
  setCell(row, map.pincode, survey.pincode ?? "")
  setCell(row, map.houseNo, survey.houseNo ?? "")
  setCell(row, map.streetName, survey.streetName ?? "")
  setCell(row, map.locality, survey.locality ?? "")
  setCell(row, map.colony, survey.colony ?? "")
  setCell(row, map.taxRateZone, survey.taxRateZone ?? "")
  setCell(row, map.propertyOwnership, survey.propertyOwnership ?? "")
  setCell(row, map.propertyUse, survey.propertyUse ?? "")
  setCell(row, map.commercial, survey.commercial ?? "")
  setCell(row, map.yearOfConstruction, survey.yearOfConstruction ?? "")
  setCell(row, map.situation, survey.situation ?? "")
  setCell(row, map.roadType, survey.roadType ?? "")
  setCell(row, map.floorsRaw, survey.floorsRaw ?? "")
  setCell(row, map.plotAreaSqFt, formatDecimalForExcel(survey.plotAreaSqFt))
  setCell(
    row,
    map.plotAreaSqMeter,
    formatDecimalForExcel(survey.plotAreaSqMeter)
  )
  setCell(row, map.plinthAreaSqFt, formatDecimalForExcel(survey.plinthAreaSqFt))
  setCell(
    row,
    map.plinthAreaSqMeter,
    formatDecimalForExcel(survey.plinthAreaSqMeter)
  )
  setCell(
    row,
    map.totalBuiltUpAreaSqFt,
    formatDecimalForExcel(survey.totalBuiltUpAreaSqFt)
  )
  setCell(
    row,
    map.totalBuiltUpAreaSqMeter,
    formatDecimalForExcel(survey.totalBuiltUpAreaSqMeter)
  )
  setCell(
    row,
    map.hasMunicipalWaterSupply,
    formatBoolForExcel(survey.hasMunicipalWaterSupply)
  )
  setCell(row, map.totalWaterConnections, survey.totalWaterConnections ?? "")
  setCell(row, map.waterConnectionIdType, survey.waterConnectionIdType ?? "")
  setCell(row, map.toiletType, survey.toiletType ?? "")
  setCell(
    row,
    map.hasMunicipalWasteService,
    formatBoolForExcel(survey.hasMunicipalWasteService)
  )

  if (map.remark != null) setCell(row, map.remark, survey.remark ?? "")
  if (map.electricityId != null) {
    setCell(row, map.electricityId, survey.electricityId ?? "")
  }
  if (map.khasraNo != null) setCell(row, map.khasraNo, survey.khasraNo ?? "")
  if (map.registryNo != null)
    setCell(row, map.registryNo, survey.registryNo ?? "")
  if (map.constructedDate != null) {
    setCell(row, map.constructedDate, survey.constructedDate ?? "")
  }
  if (map.ownerAadhaar != null) {
    setCell(row, map.ownerAadhaar, survey.ownerAadhaar ?? "")
  }
  if (map.presentHouseNo != null) {
    setCell(row, map.presentHouseNo, survey.presentHouseNo ?? "")
  }
  if (map.presentStreetName != null) {
    setCell(row, map.presentStreetName, survey.presentStreetName ?? "")
  }
  if (map.presentLocality != null) {
    setCell(row, map.presentLocality, survey.presentLocality ?? "")
  }
  if (map.presentColony != null) {
    setCell(row, map.presentColony, survey.presentColony ?? "")
  }
  if (map.presentCity != null)
    setCell(row, map.presentCity, survey.presentCity ?? "")
  if (map.presentPincode != null) {
    setCell(row, map.presentPincode, survey.presentPincode ?? "")
  }
  if (map.isSameAsProperty != null) {
    setCell(
      row,
      map.isSameAsProperty,
      formatBoolForExcel(survey.isSameAsProperty)
    )
  }
  if (map.exemptionType != null) {
    setCell(row, map.exemptionType, survey.exemptionType ?? "")
  }
  if (map.exemptionApplicable != null) {
    setCell(
      row,
      map.exemptionApplicable,
      formatBoolForExcel(survey.exemptionApplicable)
    )
  }

  if (map.hasAlternateWater != null) {
    setCell(
      row,
      map.hasAlternateWater,
      formatBoolForExcel(survey.hasAlternateWater)
    )
  } else if (map.remark != null) {
    setCell(
      row,
      V2_ALTERNATE_WATER_COL,
      formatBoolForExcel(survey.hasAlternateWater)
    )
  }
  if (map.waterSourceType != null) {
    setCell(row, map.waterSourceType, survey.waterSourceType ?? "")
  } else if (map.remark != null) {
    setCell(row, V2_WATER_SOURCE_COL, survey.waterSourceType ?? "")
  }
}

export function surveyToExcelRow(
  survey: SurveyExportRecord,
  preset: MappingPreset,
  sn?: number
): unknown[] {
  const headers = getExportHeaders(preset)
  const row: unknown[] = new Array(headers.length).fill("")
  const map = getMapping(preset)

  if (preset === "chhata-v2-55" && sn != null) {
    setCell(row, 0, sn)
  }

  applyMappedFields(row, map, survey)
  return row
}

export function buildSurveyExportWorkbook(
  surveys: SurveyExportRecord[],
  preset: MappingPreset
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(SURVEY_EXPORT_SHEET_NAME)
  const headers = getExportHeaders(preset)
  sheet.addRow([...headers])

  surveys.forEach((survey, index) => {
    const sn = preset === "chhata-v2-55" ? index + 1 : undefined
    sheet.addRow(surveyToExcelRow(survey, preset, sn))
  })

  return workbook
}

export function buildSurveyExportFilename(options: {
  wardNumber?: number
  at?: Date
}): string {
  const stamp = (options.at ?? new Date()).toISOString().slice(0, 10)
  if (options.wardNumber != null) {
    return `survey-export-ward-${options.wardNumber}-${stamp}.xlsx`
  }
  return `survey-export-all-${stamp}.xlsx`
}
