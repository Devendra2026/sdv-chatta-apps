/** Column index maps for Chhata Excel layouts (0-based). */

import { wardNumberFromSurveyId } from "@workspace/types"

export type ColumnMap = {
  surveyId: number
  surveyedAt: number
  ownerName: number
  ownerFatherName: number
  mobile: number
  wardName: number
  isSlum: number
  parcelNo: number
  propertyNo: number
  respondentName: number
  respondentRelationship: number
  city: number
  pincode: number
  houseNo: number
  streetName: number
  locality: number
  colony: number
  taxRateZone: number
  propertyOwnership: number
  propertyUse: number
  commercial: number
  yearOfConstruction: number
  situation: number
  roadType: number
  floorsRaw: number
  plotAreaSqFt: number
  plotAreaSqMeter: number
  plinthAreaSqFt: number
  plinthAreaSqMeter: number
  totalBuiltUpAreaSqFt: number
  totalBuiltUpAreaSqMeter: number
  hasMunicipalWaterSupply: number
  totalWaterConnections: number
  waterConnectionIdType: number
  toiletType: number
  hasMunicipalWasteService: number
  remark?: number
  electricityId?: number
  khasraNo?: number
  registryNo?: number
  constructedDate?: number
  ownerAadhaar?: number
  presentHouseNo?: number
  presentStreetName?: number
  presentLocality?: number
  presentColony?: number
  presentCity?: number
  presentPincode?: number
  isSameAsProperty?: number
  exemptionType?: number
  exemptionApplicable?: number
  hasAlternateWater?: number
  waterSourceType?: number
}

/** Ward 1 workbook: 38 cols, starts with Survey Id (no SN / Actions). */
export const CHHATA_V1_38: ColumnMap = {
  surveyId: 0,
  surveyedAt: 1,
  ownerName: 2,
  ownerFatherName: 3,
  mobile: 4,
  wardName: 5,
  isSlum: 6,
  parcelNo: 7,
  propertyNo: 8,
  respondentName: 9,
  respondentRelationship: 10,
  city: 11,
  pincode: 12,
  houseNo: 13,
  streetName: 14,
  locality: 15,
  colony: 16,
  taxRateZone: 17,
  propertyOwnership: 18,
  propertyUse: 19,
  commercial: 20,
  yearOfConstruction: 21,
  situation: 22,
  roadType: 23,
  floorsRaw: 24,
  plotAreaSqFt: 25,
  plotAreaSqMeter: 26,
  plinthAreaSqFt: 27,
  plinthAreaSqMeter: 28,
  totalBuiltUpAreaSqFt: 29,
  totalBuiltUpAreaSqMeter: 30,
  hasMunicipalWaterSupply: 31,
  totalWaterConnections: 32,
  waterConnectionIdType: 33,
  toiletType: 34,
  hasMunicipalWasteService: 35,
  // Trailing headers are duplicated "Is Muncipal Water Supply"; values are yes/no + source.
  hasAlternateWater: 36,
  waterSourceType: 37,
}

/**
 * Ward exports that start with Survey Id but insert Owner Aadhaar after
 * Respondent Relationship (39 cols). Using v1-38 on these shifts Floors → Road Type.
 */
export const CHHATA_V1_39: ColumnMap = {
  surveyId: 0,
  surveyedAt: 1,
  ownerName: 2,
  ownerFatherName: 3,
  mobile: 4,
  wardName: 5,
  isSlum: 6,
  parcelNo: 7,
  propertyNo: 8,
  respondentName: 9,
  respondentRelationship: 10,
  ownerAadhaar: 11,
  city: 12,
  pincode: 13,
  houseNo: 14,
  streetName: 15,
  locality: 16,
  colony: 17,
  taxRateZone: 18,
  propertyOwnership: 19,
  propertyUse: 20,
  commercial: 21,
  yearOfConstruction: 22,
  situation: 23,
  roadType: 24,
  floorsRaw: 25,
  plotAreaSqFt: 26,
  plotAreaSqMeter: 27,
  plinthAreaSqFt: 28,
  plinthAreaSqMeter: 29,
  totalBuiltUpAreaSqFt: 30,
  totalBuiltUpAreaSqMeter: 31,
  hasMunicipalWaterSupply: 32,
  totalWaterConnections: 33,
  waterConnectionIdType: 34,
  toiletType: 35,
  hasMunicipalWasteService: 36,
  hasAlternateWater: 37,
  waterSourceType: 38,
}

/** Ward 2+ workbooks: 55 cols, SN + Actions then Survey Id. */
export const CHHATA_V2_55: ColumnMap = {
  surveyId: 2,
  surveyedAt: 3,
  ownerName: 4,
  ownerFatherName: 5,
  mobile: 6,
  wardName: 7,
  isSlum: 8,
  remark: 9,
  parcelNo: 10,
  propertyNo: 11,
  electricityId: 12,
  khasraNo: 13,
  registryNo: 14,
  constructedDate: 15,
  respondentName: 16,
  respondentRelationship: 17,
  ownerAadhaar: 18,
  city: 19,
  pincode: 20,
  houseNo: 21,
  streetName: 22,
  locality: 23,
  colony: 24,
  presentHouseNo: 25,
  presentStreetName: 26,
  presentLocality: 27,
  presentColony: 28,
  presentCity: 29,
  presentPincode: 30,
  isSameAsProperty: 31,
  taxRateZone: 32,
  propertyOwnership: 33,
  propertyUse: 34,
  commercial: 35,
  yearOfConstruction: 36,
  exemptionType: 37,
  exemptionApplicable: 38,
  situation: 39,
  roadType: 40,
  floorsRaw: 41,
  plotAreaSqFt: 42,
  plotAreaSqMeter: 43,
  plinthAreaSqFt: 44,
  plinthAreaSqMeter: 45,
  totalBuiltUpAreaSqFt: 46,
  totalBuiltUpAreaSqMeter: 47,
  hasMunicipalWaterSupply: 48,
  totalWaterConnections: 49,
  waterConnectionIdType: 50,
  toiletType: 51,
  hasMunicipalWasteService: 52,
}

export type MappingPreset = "chhata-v1-38" | "chhata-v1-39" | "chhata-v2-55"

const EMPTY_CELL = /^(n\/a|na|null|-|none)$/i

function normHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Exact header tokens → ColumnMap keys (Present* fields use distinct tokens). */
const HEADER_FIELD_TOKENS: Array<{ key: keyof ColumnMap; token: string }> = [
  { key: "surveyId", token: "surveyid" },
  { key: "surveyedAt", token: "dateofsurvey" },
  { key: "ownerName", token: "ownername" },
  { key: "ownerFatherName", token: "ownerfathername" },
  { key: "mobile", token: "mobileno" },
  { key: "wardName", token: "wardname" },
  { key: "isSlum", token: "isslum" },
  { key: "remark", token: "remark" },
  { key: "parcelNo", token: "parcelno" },
  { key: "propertyNo", token: "propertyno" },
  { key: "electricityId", token: "electricityid" },
  { key: "khasraNo", token: "khasrano" },
  { key: "registryNo", token: "registryno" },
  { key: "constructedDate", token: "constructeddate" },
  { key: "respondentName", token: "respondentname" },
  { key: "respondentRelationship", token: "respondentrelationship" },
  { key: "ownerAadhaar", token: "owneraadhaarnumber" },
  { key: "city", token: "city" },
  { key: "pincode", token: "pincode" },
  { key: "houseNo", token: "houseno" },
  { key: "streetName", token: "streetname" },
  { key: "locality", token: "locality" },
  { key: "colony", token: "colony" },
  { key: "presentHouseNo", token: "presenthouseno" },
  { key: "presentStreetName", token: "presentstreetname" },
  { key: "presentLocality", token: "presentlocality" },
  { key: "presentColony", token: "presentcolony" },
  { key: "presentCity", token: "presentcity" },
  { key: "presentPincode", token: "presentpincode" },
  { key: "isSameAsProperty", token: "issameasproperty" },
  { key: "taxRateZone", token: "taxratezone" },
  { key: "propertyOwnership", token: "propertyownership" },
  { key: "propertyUse", token: "propertyuse" },
  { key: "commercial", token: "commercial" },
  { key: "yearOfConstruction", token: "yearofconstruction" },
  { key: "exemptionType", token: "exemptiontype" },
  { key: "exemptionApplicable", token: "exemptionapplicable" },
  { key: "situation", token: "situation" },
  { key: "roadType", token: "roadtype" },
  { key: "floorsRaw", token: "floors" },
  { key: "plotAreaSqFt", token: "plotareasqft" },
  { key: "plotAreaSqMeter", token: "plotareasqmeter" },
  { key: "plinthAreaSqFt", token: "plinthareasqft" },
  { key: "plinthAreaSqMeter", token: "plinthareasqmeter" },
  { key: "totalBuiltUpAreaSqFt", token: "totalbuiltupareasqft" },
  { key: "totalBuiltUpAreaSqMeter", token: "totalbuiltupareasqmeter" },
  { key: "hasMunicipalWaterSupply", token: "ismuncipalwatersupply" },
  { key: "totalWaterConnections", token: "totalwaterconnection" },
  { key: "waterConnectionIdType", token: "waterconnectionidtype" },
  { key: "toiletType", token: "toilettype" },
  { key: "hasMunicipalWasteService", token: "ismuncipalwasteservice" },
]

/**
 * Override preset indexes using actual header row labels.
 * Prevents Floors/areas/zone corruption when Excel variants insert columns.
 */
export function refineMappingFromHeaders(
  base: ColumnMap,
  headers: string[]
): ColumnMap {
  const refined: ColumnMap = { ...base }
  const normalized = headers.map((h) => normHeader(h ?? ""))

  for (const { key, token } of HEADER_FIELD_TOKENS) {
    const idx = normalized.findIndex((h) => h === token)
    if (idx >= 0) {
      refined[key] = idx as never
    }
  }

  // Trailing duplicate "Is Muncipal Water Supply" → alternate water fields (v1 layouts).
  const waterSupplyIdxs = normalized
    .map((h, i) => (h === "ismuncipalwatersupply" ? i : -1))
    .filter((i) => i >= 0)
  if (waterSupplyIdxs.length >= 2 && waterSupplyIdxs[1] != null) {
    refined.hasAlternateWater = waterSupplyIdxs[1]
  }
  if (waterSupplyIdxs.length >= 3 && waterSupplyIdxs[2] != null) {
    refined.waterSourceType = waterSupplyIdxs[2]
  }

  return refined
}

export function detectPreset(columnCount: number): MappingPreset {
  return columnCount >= 50 ? "chhata-v2-55" : "chhata-v1-38"
}

export function detectPresetFromHeaders(
  headers: string[],
  columnCount = headers.length
): MappingPreset {
  const first = (headers[0] ?? "").toLowerCase().replace(/[.\s]/g, "")
  if (first === "sn" || first === "sno") return "chhata-v2-55"
  if (first.includes("surveyid")) {
    const hasAadhaar = headers.some((h) => /aadhaar/i.test(h ?? ""))
    const floorsIdx = headers.findIndex(
      (h) => normHeader(h ?? "") === "floors"
    )
    // Survey-Id-first sheets with Owner Aadhaar (or Floors at col 26) use v1-39.
    if (hasAadhaar || floorsIdx === 25) return "chhata-v1-39"
    return "chhata-v1-38"
  }
  return detectPreset(columnCount)
}

export function getMapping(preset: MappingPreset): ColumnMap {
  if (preset === "chhata-v2-55") return CHHATA_V2_55
  if (preset === "chhata-v1-39") return CHHATA_V1_39
  return CHHATA_V1_38
}

/** Detect preset then align indexes to the real header row. */
export function resolveColumnMap(
  headers: string[],
  columnCount = headers.length
): { preset: MappingPreset; map: ColumnMap } {
  const preset = detectPresetFromHeaders(headers, columnCount)
  return { preset, map: refineMappingFromHeaders(getMapping(preset), headers) }
}

export function excelValueToString(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return ""
    return String(value)
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "string") return value.trim()
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    if (typeof obj.text === "string") return obj.text.trim()
    if ("result" in obj) return excelValueToString(obj.result)
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) =>
          typeof part === "object" && part && "text" in part
            ? String((part as { text?: unknown }).text ?? "")
            : ""
        )
        .join("")
        .trim()
    }
  }
  return String(value).trim()
}

export function cell(row: unknown[], index?: number): string {
  if (index == null || index < 0) return ""
  const text = excelValueToString(row[index])
  if (!text || EMPTY_CELL.test(text)) return ""
  return text
}

export function parseBool(value: string): boolean | undefined {
  const v = value.toLowerCase()
  if (!v || EMPTY_CELL.test(v)) return undefined
  if (["y", "yes", "true", "1"].includes(v)) return true
  if (["n", "no", "false", "0"].includes(v)) return false
  return undefined
}

export function parseNumber(value: string): number | undefined {
  if (!value || EMPTY_CELL.test(value.toLowerCase())) return undefined
  const n = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(n) ? n : undefined
}

export function parseSurveyedAt(value: string): Date | undefined {
  if (!value) return undefined
  const normalized = value.replace(/\s+at\s+/i, " ")
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function extractWardNumber(wardName: string, surveyId: string): number | null {
  const fromName = wardName.match(/वार्ड\s*नंबर\s*(\d+)|ward\s*(?:no\.?|number)?\s*(\d+)/i)
  if (fromName) {
    const n = Number(fromName[1] ?? fromName[2])
    return Number.isFinite(n) ? n : null
  }
  const fromId = wardNumberFromSurveyId(surveyId)
  if (fromId != null) return fromId
  return null
}

export {
  normalizeParcelNoFromExcel as normalizeParcelNo,
  normalizePropertyNoFromExcel as normalizePropertyNo,
  parcelFromSurveyId,
  propertyFromSurveyId,
} from "@workspace/types"
