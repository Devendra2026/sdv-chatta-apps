/** Column index maps for Chhata Excel layouts (0-based). */

export const CHHATA_V1_38 = {
  surveyId: 0,
  surveyedAt: 1,
  wardName: 2,
  ownerName: 3,
  ownerFatherName: 4,
  mobile: 5,
  isSlum: 6,
  remark: 7,
  parcelNo: 8,
  propertyNo: 9,
  electricityId: 10,
  khasraNo: 11,
  registryNo: 12,
  constructedDate: 13,
  respondentName: 14,
  respondentRelationship: 15,
  city: 16,
  pincode: 17,
  houseNo: 18,
  streetName: 19,
  locality: 20,
  colony: 21,
  presentHouseNo: 22,
  presentStreetName: 23,
  presentLocality: 24,
  presentColony: 25,
  presentCity: 26,
  presentPincode: 27,
  isSameAsProperty: 28,
  taxRateZone: 29,
  propertyOwnership: 30,
  propertyUse: 31,
  commercial: 32,
  yearOfConstruction: 33,
  exemptionType: 34,
  exemptionApplicable: 35,
  situation: 36,
  roadType: 37,
} as const

export const CHHATA_V2_55 = {
  ...CHHATA_V1_38,
  floorsRaw: 38,
  plotAreaSqFt: 39,
  plotAreaSqMeter: 40,
  plinthAreaSqFt: 41,
  plinthAreaSqMeter: 42,
  totalBuiltUpAreaSqFt: 43,
  totalBuiltUpAreaSqMeter: 44,
  hasMunicipalWaterSupply: 45,
  hasAlternateWater: 46,
  waterSourceType: 47,
  totalWaterConnections: 48,
  waterConnectionIdType: 49,
  toiletType: 50,
  hasMunicipalWasteService: 51,
  ownerAadhaar: 52,
} as const

export type MappingPreset = "chhata-v1-38" | "chhata-v2-55"

export function detectPreset(columnCount: number): MappingPreset {
  return columnCount >= 50 ? "chhata-v2-55" : "chhata-v1-38"
}

export function getMapping(preset: MappingPreset) {
  return preset === "chhata-v2-55" ? CHHATA_V2_55 : CHHATA_V1_38
}

export function cell(row: unknown[], index?: number): string {
  if (index == null || index < 0) return ""
  const v = row[index]
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

export function parseBool(value: string): boolean | undefined {
  const v = value.toLowerCase()
  if (!v || v === "n/a" || v === "null") return undefined
  if (["y", "yes", "true", "1"].includes(v)) return true
  if (["n", "no", "false", "0"].includes(v)) return false
  return undefined
}

export function parseNumber(value: string): number | undefined {
  if (!value || value === "N/A" || value === "null") return undefined
  const n = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(n) ? n : undefined
}

export function parseSurveyedAt(value: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function extractWardNumber(wardName: string, surveyId: string): number | null {
  const fromName = wardName.match(/(\d+)/)
  if (fromName) return Number(fromName[1])
  const fromId = surveyId.match(/^\d+-(\d{3})-/)
  if (fromId) return Number(fromId[1])
  return null
}
