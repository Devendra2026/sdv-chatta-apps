/** GIS Survey Id format: `{ulbCode}-{ward3}-{parcel6}-{property3}-{gisUseCode}` e.g. 249044-001-000131-001-R */

export const CHHATA_ULB_CODE = "249044"

export type GisSurveyParts = {
  ulbCode: string
  wardNo: string
  parcelNo: string
  propertyNo: string
  gisUseCode: string
}

export type GenerateSurveyIdInput = {
  ulbCode: string
  wardNo: number | string
  parcelNo: string
  propertyNo: string
  gisUseCode: string
}

export type BuildSurveyIdFromRecordInput = {
  surveyId?: string | null
  wardNumber: number
  parcelNo?: string | null
  propertyNo?: string | null
  gisUseCode?: string | null
  ulbCode?: string
}

const GIS_SURVEY_ID_PATTERN =
  /^(\d+)-(\d{3})-(\d+)-(\d+)-([A-Za-z])$/

export function parseGisSurveyId(
  surveyId?: string | null
): GisSurveyParts | null {
  if (!surveyId) return null
  const match = surveyId.trim().match(GIS_SURVEY_ID_PATTERN)
  if (
    !match?.[1] ||
    !match[2] ||
    !match[3] ||
    !match[4] ||
    !match[5]
  ) {
    return null
  }
  return {
    ulbCode: match[1],
    wardNo: match[2],
    parcelNo: match[3],
    propertyNo: match[4],
    gisUseCode: match[5].toUpperCase(),
  }
}

export function normalizeWardCode(wardNo: number | string): string {
  const digits = String(wardNo).replace(/\D/g, "")
  if (!digits) {
    throw new Error("Ward number is required")
  }
  return digits.padStart(3, "0")
}

export function normalizeParcelNo(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) {
    throw new Error("Parcel number is required")
  }
  return digits.padStart(Math.max(6, digits.length), "0")
}

export function normalizePropertyNo(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) {
    throw new Error("Property number is required")
  }
  return digits.padStart(Math.max(3, digits.length), "0")
}

export function normalizeGisUseCode(value: string): string {
  const letter = value.trim().replace(/[^A-Za-z]/g, "")
  if (!letter) {
    throw new Error("GIS use code is required")
  }
  return letter.charAt(0).toUpperCase()
}

export function generateSurveyId(input: GenerateSurveyIdInput): string {
  const ulbCode = input.ulbCode.trim()
  const wardCode = normalizeWardCode(input.wardNo)
  const parcelNo = normalizeParcelNo(input.parcelNo)
  const propertyNo = normalizePropertyNo(input.propertyNo)
  const gisUseCode = normalizeGisUseCode(input.gisUseCode)
  return `${ulbCode}-${wardCode}-${parcelNo}-${propertyNo}-${gisUseCode}`
}

export function buildSurveyIdFromRecord(
  input: BuildSurveyIdFromRecordInput
): string {
  const parsed = input.surveyId ? parseGisSurveyId(input.surveyId) : null
  const ulbCode = input.ulbCode ?? parsed?.ulbCode ?? CHHATA_ULB_CODE
  const parcelNo = normalizeParcelNo(
    input.parcelNo ?? parsed?.parcelNo ?? ""
  )
  const propertyNo = normalizePropertyNo(
    input.propertyNo ?? parsed?.propertyNo ?? ""
  )
  const gisUseCode = normalizeGisUseCode(
    input.gisUseCode ?? parsed?.gisUseCode ?? ""
  )
  return generateSurveyId({
    ulbCode,
    wardNo: input.wardNumber,
    parcelNo,
    propertyNo,
    gisUseCode,
  })
}

/** Parcel segment from GIS Survey Id (import helper). */
export function parcelFromSurveyId(surveyId: string): string | null {
  return parseGisSurveyId(surveyId)?.parcelNo ?? null
}

/** Property segment from GIS Survey Id (import helper). */
export function propertyFromSurveyId(surveyId: string): string | null {
  return parseGisSurveyId(surveyId)?.propertyNo ?? null
}

/** Ward number from GIS Survey Id segment. Returns null for placeholder `000`. */
export function wardNumberFromSurveyId(surveyId: string): number | null {
  const parsed = parseGisSurveyId(surveyId)
  if (!parsed) return null
  const n = Number(parsed.wardNo)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

/** Resolve canonical survey id for Excel import (ward from file, not placeholder segment). */
export function resolveImportSurveyId(
  rawSurveyId: string,
  wardNumber: number,
  parcelNo: string,
  propertyNo: string,
  ulbCode: string = CHHATA_ULB_CODE
): string {
  const parsed = parseGisSurveyId(rawSurveyId)
  return buildSurveyIdFromRecord({
    surveyId: rawSurveyId,
    wardNumber,
    parcelNo,
    propertyNo,
    gisUseCode: parsed?.gisUseCode,
    ulbCode,
  })
}

export function normalizeParcelNoFromExcel(
  excelValue: string,
  surveyId: string
): string | null {
  const fromId = parcelFromSurveyId(surveyId)
  if (fromId) return fromId
  const trimmed = excelValue.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return trimmed
  return digits.padStart(Math.max(6, digits.length), "0")
}

export function normalizePropertyNoFromExcel(
  excelValue: string,
  surveyId: string
): string | null {
  const fromId = propertyFromSurveyId(surveyId)
  if (fromId) return fromId
  const trimmed = excelValue.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return trimmed
  return digits.padStart(Math.max(3, digits.length), "0")
}

export function formatParcelNo(
  parcelNo: string | null | undefined,
  surveyId?: string | null
): string {
  const fromId = surveyId ? parcelFromSurveyId(surveyId) : null
  if (fromId) return fromId
  const raw = parcelNo?.trim() ?? ""
  if (/^\d+$/.test(raw)) return raw.padStart(6, "0")
  return raw || "—"
}

export function formatPropertyNo(
  propertyNo: string | null | undefined,
  surveyId?: string | null
): string {
  const fromId = surveyId ? propertyFromSurveyId(surveyId) : null
  if (fromId) return fromId
  const raw = propertyNo?.trim() ?? ""
  if (/^\d+$/.test(raw)) return raw.padStart(3, "0")
  return raw || "—"
}
