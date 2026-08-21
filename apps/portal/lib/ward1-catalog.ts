/** Option catalogs taken from Ward 1.xlsx (344 rows). */

export const YES_NO = ["Yes", "No"] as const

export const RESPONDENT_RELATIONSHIPS = [
  "Self",
  "Son",
  "Wife",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Other",
] as const

export const CITIES = ["Chhata", "Chhata Rural", "Agra"] as const

export const TAX_RATE_ZONES = [
  "RATE ZONE 1 (Upto 9 Meters)",
  "RATE ZONE 2 (9 meters and upto 12 meters)",
  "RATE ZONE 3 (12 Meters And Upto 24 Meters)",
] as const

export const PROPERTY_OWNERSHIPS = [
  "Individual (Single/Joint)",
  "HFA (Awasiy Makan)",
] as const

export const PROPERTY_USES = [
  "Residential Self",
  "Residential Rented",
  "Open Land",
] as const

export const COMMERCIAL_USES = [
  "Shops/Office Bank",
  "Restuurents/lodging house",
] as const

export const YEARS_OF_CONSTRUCTION = [
  "Prior to 1900",
  "Between 1900 & 1997",
  "After 1997",
] as const

export const SITUATIONS = ["Interior"] as const

export const ROAD_TYPES = ["rcc road", "Other(null)"] as const

export const TOILET_TYPES = [
  "Connected to specific tank",
  "Connected to municipal sewage system",
  "No toilet",
] as const

export const WATER_SOURCES = [
  "Government Tap",
  "Dug well",
  "Borewell",
  "Other(Naa)",
  "Other(Na)",
  "Other(No)",
  "Other(Hedpamp)",
] as const

export function withCurrentOption(
  options: readonly string[],
  current?: string | null
): string[] {
  const value = current?.trim() ?? ""
  if (!value) return [...options]
  if (options.some((option) => option.toLowerCase() === value.toLowerCase())) {
    return [...options]
  }
  return [value, ...options]
}
