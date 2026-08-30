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

export type MappingPreset = "chhata-v1-38" | "chhata-v2-55"

const EMPTY_CELL = /^(n\/a|na|null|-|none)$/i

export function detectPreset(columnCount: number): MappingPreset {
  return columnCount >= 50 ? "chhata-v2-55" : "chhata-v1-38"
}

export function detectPresetFromHeaders(
  headers: string[],
  columnCount = headers.length
): MappingPreset {
  const first = (headers[0] ?? "").toLowerCase().replace(/[.\s]/g, "")
  if (first === "sn" || first === "sno") return "chhata-v2-55"
  if (first.includes("surveyid")) return "chhata-v1-38"
  return detectPreset(columnCount)
}

export function getMapping(preset: MappingPreset): ColumnMap {
  return preset === "chhata-v2-55" ? CHHATA_V2_55 : CHHATA_V1_38
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
