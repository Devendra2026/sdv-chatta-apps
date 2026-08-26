/** Chhata Excel floor blob parse/serialize (mirrors API floors.util). */

export type FloorRow = {
  id: string
  floorLabel: string
  areaSqFt?: number
  areaSqMeter?: number
  usageType?: string
  usageFactor?: string
  buildingType?: string
  sortOrder: number
}

export const FLOOR_LABELS = [
  "Basement",
  "Ground Floor",
  "First Floor",
  "Second Floor",
  "Third Floor",
  "Fourth Floor",
  "Terrace",
] as const

export const FLOOR_USAGE_TYPES = [
  "Residential",
  "Commercial",
  "Mixed",
  "Open Land",
  "Under Construction",
] as const

export const FLOOR_USAGE_FACTORS = [
  "Self Occupied",
  "Rented",
  "Vacant",
] as const

export const FLOOR_CONSTRUCTION_TYPES = [
  "Pakka Building with R.C.C Roof or R.B. Roof",
  "Tin Shed",
  "Kaccha Building",
  "Open Land",
  "Under Construction",
] as const

const SQ_FT_TO_SQ_M = 0.092903

export function sqFtToSqM(sqFt: number): number {
  return Math.round(sqFt * SQ_FT_TO_SQ_M * 100) / 100
}

export function parseFloorsRaw(floorsRaw?: string | null): FloorRow[] {
  if (!floorsRaw?.trim()) return []

  const segments = floorsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  return segments.map((segment, index) => {
    const parts = segment.split("||").map((p) => p.trim())
    const head = parts[0] ?? segment

    const labelMatch = head.match(/^(.+?)\s*-\s*([\d.]+)\s*SqFt/i)
    const sqmMatch = head.match(/([\d.]+)\s*SqMt/i)

    let usageType: string | undefined
    let usageFactor: string | undefined
    let buildingType: string | undefined
    const usageTypeValues: string[] = []

    for (const part of parts.slice(1)) {
      const usageMatches = [
        ...part.matchAll(/Usage Type\s*-\s*(.+?)(?=\s*\|\||$)/gi),
      ]
      for (const m of usageMatches) {
        if (m[1]) usageTypeValues.push(m[1].trim())
      }
      const factor = part.match(/Usage Factor\s*-\s*(.+)$/i)
      if (factor?.[1]) usageFactor = factor[1].trim()
    }

    usageType = usageTypeValues[0]
    buildingType = usageTypeValues[1]

    return {
      id: `floor-${index}-${labelMatch?.[1]?.trim() ?? index}`,
      floorLabel: labelMatch?.[1]?.trim() || `Floor ${index + 1}`,
      areaSqFt: labelMatch?.[2] ? Number(labelMatch[2]) : undefined,
      areaSqMeter: sqmMatch?.[1] ? Number(sqmMatch[1]) : undefined,
      usageType,
      usageFactor,
      buildingType,
      sortOrder: index,
    }
  })
}

export function serializeFloorsRaw(
  floors: Array<{
    floorLabel: string
    areaSqFt?: number
    areaSqMeter?: number
    usageType?: string
    usageFactor?: string
    buildingType?: string
  }>
): string {
  return floors
    .map((floor) => {
      const label = floor.floorLabel.trim() || "Floor"
      const sqFt = floor.areaSqFt ?? 0
      const sqM =
        floor.areaSqMeter ?? (Number.isFinite(sqFt) ? sqFtToSqM(sqFt) : 0)
      const parts = [
        `${label} - ${formatNumber(sqFt)} SqFt - ${formatNumber(sqM)} SqMt`,
      ]
      if (floor.usageType?.trim()) {
        parts.push(`Usage Type - ${floor.usageType.trim()}`)
      }
      if (floor.usageFactor?.trim()) {
        parts.push(`Usage Factor - ${floor.usageFactor.trim()}`)
      }
      if (floor.buildingType?.trim()) {
        parts.push(`Usage Type - ${floor.buildingType.trim()}`)
      }
      return parts.join(" || ")
    })
    .join(", ")
}

export function sumFloorAreaSqFt(
  floors: Array<{ areaSqFt?: number | null }>
): number {
  return floors.reduce((sum, floor) => {
    const area = floor.areaSqFt
    return sum + (typeof area === "number" && Number.isFinite(area) ? area : 0)
  }, 0)
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
