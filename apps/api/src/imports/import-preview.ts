/** Pure helpers for Excel import preview classification (no DB writes). */

const SQFT_PER_SQM = 10.7639
/** Relative error above this flags sqft/sqm inconsistency (values unchanged). */
const AREA_REL_TOLERANCE = 0.15

export type ImportPreviewClassification =
  | "valid"
  | "invalid"
  | "duplicate"
  | "warning"

export type ImportPreviewSampleRow = {
  rowNumber: number
  surveyId: string | null
  classification: ImportPreviewClassification
  messages: string[]
}

export type ImportPreviewResult = {
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  warningRows: number
  sampleRows: ImportPreviewSampleRow[]
  unmappedHeaders: string[]
  columnMapping: Record<string, number>
  warnings: string[]
}

/** Empty city is not a warning; only non-Chhata values are flagged. */
export function isAllowedChhataCity(city: string): boolean {
  const normalized = city.trim().toLowerCase().replace(/\s+/g, " ")
  if (!normalized) return true
  return normalized === "chhata" || normalized === "chhata rural"
}

/**
 * Flag only — never rewrite areas. Multiline floors are not checked here.
 */
export function areaPairInconsistent(
  sqFt: number | undefined,
  sqM: number | undefined
): boolean {
  if (sqFt == null || sqM == null) return false
  if (!(sqFt > 0) || !(sqM > 0)) return false
  const expectedSqFt = sqM * SQFT_PER_SQM
  const denom = Math.max(expectedSqFt, sqFt)
  if (denom <= 0) return false
  return Math.abs(sqFt - expectedSqFt) / denom > AREA_REL_TOLERANCE
}

export function collectAreaInconsistencyMessages(input: {
  plotAreaSqFt?: number
  plotAreaSqMeter?: number
  plinthAreaSqFt?: number
  plinthAreaSqMeter?: number
  totalBuiltUpAreaSqFt?: number
  totalBuiltUpAreaSqMeter?: number
}): string[] {
  const messages: string[] = []
  if (areaPairInconsistent(input.plotAreaSqFt, input.plotAreaSqMeter)) {
    messages.push("Plot area sq ft vs sq m look inconsistent")
  }
  if (areaPairInconsistent(input.plinthAreaSqFt, input.plinthAreaSqMeter)) {
    messages.push("Plinth area sq ft vs sq m look inconsistent")
  }
  if (
    areaPairInconsistent(
      input.totalBuiltUpAreaSqFt,
      input.totalBuiltUpAreaSqMeter
    )
  ) {
    messages.push("Built-up area sq ft vs sq m look inconsistent")
  }
  return messages
}

export function columnMapToJson(
  map: Record<string, number | undefined>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "number" && value >= 0) out[key] = value
  }
  return out
}

export function getImportMaxFileSizeBytes(): number {
  const mb = Number(process.env.IMPORT_MAX_FILE_SIZE_MB ?? 25)
  const safeMb = Number.isFinite(mb) && mb > 0 ? mb : 25
  return Math.floor(safeMb * 1024 * 1024)
}
