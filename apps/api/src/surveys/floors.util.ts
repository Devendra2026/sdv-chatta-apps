export type ParsedFloor = {
  floorLabel: string
  areaSqFt?: number
  areaSqMeter?: number
  usageType?: string
  usageFactor?: string
  buildingType?: string
  sortOrder: number
  rawSegment: string
}

/**
 * Parse Chhata Excel "Floors" blobs such as:
 * "Ground Floor - 408 SqFt - 37.90 SqMt || Usage Type - Residential || Usage Factor - Self Occupied || Usage Type - Pakka Building..."
 */
export function parseFloorsRaw(floorsRaw?: string | null): ParsedFloor[] {
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

    let usageFactor: string | undefined
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

    const usageType = usageTypeValues[0]
    const buildingType = usageTypeValues[1]

    return {
      floorLabel: labelMatch?.[1]?.trim() || `Floor ${index + 1}`,
      areaSqFt: labelMatch?.[2] ? Number(labelMatch[2]) : undefined,
      areaSqMeter: sqmMatch?.[1] ? Number(sqmMatch[1]) : undefined,
      usageType,
      usageFactor,
      buildingType,
      sortOrder: index,
      rawSegment: segment,
    }
  })
}

/**
 * Serialize structured floors back to the Chhata Excel "Floors" blob format.
 */
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
  const SQ_FT_TO_SQ_M = 0.092903
  return floors
    .map((floor) => {
      const label = floor.floorLabel.trim() || "Floor"
      const sqFt = floor.areaSqFt ?? 0
      const sqM =
        floor.areaSqMeter ?? Math.round(sqFt * SQ_FT_TO_SQ_M * 100) / 100
      const parts = [
        `${label} - ${formatFloorNumber(sqFt)} SqFt - ${formatFloorNumber(sqM)} SqMt`,
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

function formatFloorNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function computeDataQuality(input: {
  mobile?: string | null
  propertyNo?: string | null
  parcelNo?: string | null
  plotAreaSqFt?: number | null
  totalBuiltUpAreaSqFt?: number | null
}):
  | "COMPLETE"
  | "MISSING_CONTACT"
  | "MISSING_PROPERTY_NUMBER"
  | "MISSING_MEASUREMENT"
  | "NEEDS_REVIEW" {
  const mobile = (input.mobile ?? "").trim()
  const hasMobile = /^\d{10}$/.test(mobile)
  if (!hasMobile) return "MISSING_CONTACT"
  if (!input.propertyNo?.trim() && !input.parcelNo?.trim()) {
    return "MISSING_PROPERTY_NUMBER"
  }
  if (input.plotAreaSqFt == null && input.totalBuiltUpAreaSqFt == null) {
    return "MISSING_MEASUREMENT"
  }
  if (
    hasMobile &&
    (input.propertyNo || input.parcelNo) &&
    (input.plotAreaSqFt || input.totalBuiltUpAreaSqFt)
  ) {
    return "COMPLETE"
  }
  return "NEEDS_REVIEW"
}
