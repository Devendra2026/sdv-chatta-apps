/** Parcel / property display matching GIS Survey Id `249044-001-000001-001-R`. */

export const ULB_NAME = "Nagar Panchayat Chhata"

export type GisSurveyParts = {
  ulbCode: string
  wardNo: string
  parcelNo: string
  unitNo: string
  useLetter: string
}

export function parseGisSurveyId(
  surveyId?: string | null
): GisSurveyParts | null {
  if (!surveyId) return null
  const match = surveyId
    .trim()
    .match(/^(\d+)-(\d{3})-(\d+)-(\d+)-([A-Za-z])$/)
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
    unitNo: match[4],
    useLetter: match[5].toUpperCase(),
  }
}

export function toNumber(value?: string | number | null): number | null {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatArea(
  sqFt?: string | number | null,
  sqM?: string | number | null
): string {
  const ft = toNumber(sqFt)
  const m = toNumber(sqM)
  if (ft == null && m == null) return "—"
  if (m == null) return String(ft)
  if (ft == null) return `${m} sq m`
  return `${ft} (${m} sq m)`
}

export function floorUsageChecks(input: {
  plotAreaSqFt?: string | number | null
  plinthAreaSqFt?: string | number | null
  totalBuiltUpAreaSqFt?: string | number | null
  floors: Array<{ floorLabel: string; areaSqFt?: string | number | null }>
}): string[] {
  const plot = toNumber(input.plotAreaSqFt)
  const plinth = toNumber(input.plinthAreaSqFt)
  const built = toNumber(input.totalBuiltUpAreaSqFt)
  const checks: string[] = []

  if (plot != null && plot > 0 && built != null && built > plot) {
    checks.push(
      `Total built-up area (${built} sq ft) is high compared to the plot area (${plot} sq ft).`
    )
  }

  for (const floor of input.floors) {
    const area = toNumber(floor.areaSqFt)
    if (area == null) continue
    if (plot != null && plot > 0 && area > plot) {
      checks.push(
        `${floor.floorLabel} area (${area} sq ft) exceeds plot area (${plot} sq ft).`
      )
    } else if (plinth != null && plinth > 0 && area > plinth) {
      checks.push(
        `${floor.floorLabel} area (${area} sq ft) exceeds plinth area (${plinth} sq ft).`
      )
    }
  }

  return checks
}

export function qualityLabel(status: string): string {
  return status.replaceAll("_", " ")
}

export function formatParcelNo(
  parcelNo: string | null | undefined,
  surveyId?: string | null
): string {
  const fromId = surveyId?.match(/^\d+-\d{3}-(\d+)/)?.[1]
  if (fromId) return fromId
  const raw = parcelNo?.trim() ?? ""
  if (/^\d+$/.test(raw)) return raw.padStart(6, "0")
  return raw || "—"
}

export function formatPropertyNo(
  propertyNo: string | null | undefined,
  surveyId?: string | null
): string {
  const fromId = surveyId?.match(/^\d+-\d{3}-\d+-(\d+)/)?.[1]
  if (fromId) return fromId
  const raw = propertyNo?.trim() ?? ""
  if (/^\d+$/.test(raw)) return raw.padStart(3, "0")
  return raw || "—"
}
