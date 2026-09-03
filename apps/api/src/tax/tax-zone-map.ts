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
  meter_12_to_24: "METER_12_TO_24",
  above_24m: "ABOVE_24M",
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

export function mapTaxRateZoneCode(raw?: string | null): string | null {
  if (!raw?.trim()) return null
  const n = norm(raw)
  if (TAX_ZONE[n]) return TAX_ZONE[n]
  if (n.includes("9") && n.includes("meter") && !n.includes("12"))
    return "BELOW_9M"
  if (n.includes("12") && n.includes("24")) return "METER_12_TO_24"
  if (n.includes("above") || n.includes("24")) return "ABOVE_24M"
  if (n.includes("zone_1") || n.includes("upto")) return "BELOW_9M"
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
  // mixed or null → floor / property text
  const key = `${usageType ?? ""} ${propertyUse ?? ""}`.toLowerCase()
  if (
    key.includes("commercial") ||
    key.includes("non-res") ||
    key.includes("shop")
  ) {
    return false
  }
  return true
}
