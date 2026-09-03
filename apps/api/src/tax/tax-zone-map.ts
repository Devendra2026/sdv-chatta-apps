/** Map survey text fields → reference entry codes for tax lookup. */

import { parseGisSurveyId } from "@workspace/types"

export type GisUseClass = "residential" | "commercial" | "open_land" | "mixed"

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s/()-]+/g, "_")
    .replace(/_+/g, "_")
}

const TAX_ZONE: Record<string, string> = {
  below_9m: "BELOW_9M",
  upto_9_meters: "BELOW_9M",
  up_to_9_meters: "BELOW_9M",
  rate_zone_1: "BELOW_9M",
  rate_zone_1_upto_9_meters: "BELOW_9M",
  meter_9_to_12: "METER_9_TO_12",
  rate_zone_2: "METER_9_TO_12",
  rate_zone_2_9_meters_and_upto_12_meters: "METER_9_TO_12",
  meter_12_to_24: "METER_12_TO_24",
  rate_zone_3: "METER_12_TO_24",
  rate_zone_3_12_meters_and_upto_24_meters: "METER_12_TO_24",
  above_24m: "ABOVE_24M",
  rate_zone_4: "ABOVE_24M",
  rate_zone_4_above_24_meters: "ABOVE_24M",
}

const CONSTRUCTION: Record<string, string> = {
  rcc: "PAKKA_BUILDING_WITH_RCC_ROOF",
  pakka: "PAKKA_BUILDING_WITH_RCC_ROOF",
  pucca: "PAKKA_BUILDING_WITH_RCC_ROOF",
  tin: "TIN_SHED",
  teen: "TIN_SHED",
  shed: "TIN_SHED",
  kaccha: "KACCHA_BUILDING",
  kachcha: "KACCHA_BUILDING",
  open_land: "OPEN_LAND",
  open: "OPEN_LAND",
}

/**
 * Map survey Tax Rate Zone text → matrix row code.
 * Rate Zone 1 → BELOW_9M
 * Rate Zone 2 → METER_9_TO_12
 * Rate Zone 3 → METER_12_TO_24
 * Rate Zone 4 → ABOVE_24M
 */
export function mapTaxRateZoneCode(raw?: string | null): string | null {
  if (!raw?.trim()) return null
  const n = norm(raw)
  if (TAX_ZONE[n]) return TAX_ZONE[n]

  // Explicit "Rate Zone N" must win before "upto" / meter heuristics
  // (Zone 2/3 labels also contain "upto", which must not become Zone 1).
  if (/zone_4(?!\d)/.test(n)) return "ABOVE_24M"
  if (/zone_3(?!\d)/.test(n)) return "METER_12_TO_24"
  if (/zone_2(?!\d)/.test(n)) return "METER_9_TO_12"
  if (/zone_1(?!\d)/.test(n)) return "BELOW_9M"

  // Meter-width buckets (panel row labels / codes)
  if (n.includes("above") && n.includes("24")) return "ABOVE_24M"
  if (n.includes("12") && n.includes("24")) return "METER_12_TO_24"
  if (
    (n.includes("9") && n.includes("12")) ||
    n.includes("9m_to_12") ||
    n.includes("9_to_12")
  ) {
    return "METER_9_TO_12"
  }
  if (
    n.includes("below_9") ||
    n.includes("upto_9") ||
    n.includes("up_to_9") ||
    (n.includes("9") && n.includes("meter") && !n.includes("12"))
  ) {
    return "BELOW_9M"
  }
  if (n.includes("above_24") || n.includes(">24") || n.includes("24m")) {
    return "ABOVE_24M"
  }

  return null
}

export function mapConstructionCode(raw?: string | null): string {
  if (!raw?.trim()) return "PAKKA_BUILDING_WITH_RCC_ROOF"
  const n = norm(raw)
  for (const [key, code] of Object.entries(CONSTRUCTION)) {
    if (n.includes(key)) return code
  }
  return "PAKKA_BUILDING_WITH_RCC_ROOF"
}

/**
 * Classify GIS Use Code from a single letter or a full Survey Id.
 * R → residential; C → commercial; M → mixed (floor heuristics);
 * P → open plot; O → legacy alias for open plot.
 * Unknown letters → residential. Returns null when missing / unparseable.
 */
export function classifyGisUseCode(
  codeOrSurveyId?: string | null
): GisUseClass | null {
  if (!codeOrSurveyId?.trim()) return null
  const trimmed = codeOrSurveyId.trim()
  const parsed = parseGisSurveyId(trimmed)
  const letter = parsed?.gisUseCode
    ? parsed.gisUseCode
    : /^[A-Za-z]$/.test(trimmed)
      ? trimmed.toUpperCase()
      : null
  if (!letter) return null
  if (letter === "C") return "commercial"
  if (letter === "P" || letter === "O") return "open_land"
  if (letter === "M") return "mixed"
  return "residential"
}

export function isResidentialUsage(
  usageType?: string | null,
  propertyUse?: string | null,
  gisUseClass?: GisUseClass | null
): boolean {
  if (gisUseClass === "commercial" || gisUseClass === "open_land") return false
  if (gisUseClass === "residential") return true
  // mixed or null → floor Usage Type wins over property-wide Property Use
  const floor = (usageType ?? "").trim().toLowerCase()
  if (floor) {
    if (
      floor.includes("commercial") ||
      floor.includes("shop") ||
      floor.includes("godown") ||
      floor.includes("non-res")
    ) {
      return false
    }
    if (floor.includes("residential")) return true
  }
  const prop = (propertyUse ?? "").toLowerCase()
  if (
    prop.includes("commercial") ||
    prop.includes("shop") ||
    prop.includes("godown") ||
    prop.includes("non-res")
  ) {
    return false
  }
  return true
}
