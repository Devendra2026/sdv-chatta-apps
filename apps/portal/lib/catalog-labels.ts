/**
 * Display-only labels for Chhata survey catalog / legacy values.
 * Never change stored option values — only what the UI shows.
 */

/** Exact stored-value → human-readable display (case-sensitive keys). */
const EXACT_LABELS: Record<string, string> = {
  // Road / misc catalog polish
  "rcc road": "RCC Road",
  "Other(null)": "Other",
  "Other(Naa)": "Other (N/A)",
  "Other(Na)": "Other (N/A)",
  "Other(No)": "Other (No)",
  "Other(Hedpamp)": "Other (Handpump)",

  // Commercial subtypes (typos / spacing in Excel catalog)
  "Restuurents/lodging house": "Restaurants / Lodging House",
  "Shops/Office Bank": "Shops / Office / Bank",

  // Floor label when Property Use is Open Land (stored as "Open")
  Open: "Open Land",

  // Legacy / screenshot SNAKE_CASE ownership (if present in DB)
  INDIVIDUAL: "Individual",
  JOINT: "Joint",
  LIMITED_COMPANY_FIRM: "Limited Company / Firm",
  TRUST_SOCIETY: "Trust / Society",
  RELIGIOUS_BODY: "Religious Body",
  STATE_GOVERNMENT_BODY: "State Government Body",
  CENTRAL_GOVERNMENT_BODY: "Central Government Body",
  MUNICIPAL_COUNCIL_TOWN_PANCHAYAT: "Municipal Council / Town Panchayat",
  LEASE_PROPERTY: "Lease Property",

  // Legacy / screenshot property use / type codes
  RESIDENTIAL_SELF: "Residential Self",
  RESIDENTIAL_RENTED: "Residential Rented",
  OPEN_LAND: "Open Land",
  RESIDENTIAL_AND_COMMERCIAL: "Residential and Commercial",
  SHOP_BAKERY: "Shop / Bakery",
  BANK_OFFICE: "Bank / Office",
  SCHOOL_COLLEGE: "School / College",
  MALL_SHOWROOM: "Mall / Showroom",
  PETROL_PUMP: "Petrol Pump",
  HOTEL_MARRIAGE_RESTAURANT: "Hotel / Marriage Hall / Restaurant",
  HOSPITAL_NURSING_PATHOLOGY: "Hospital / Nursing Home / Pathology",
  GODOWN: "Godown",
  CENTRAL_GOVERNMENT: "Central Government",
  STATE_GOVERNMENT: "State Government",
  INDUSTRY: "Industry",
  COLD_STORE: "Cold Store",
  OPEN: "Open",
  AGRICULTURE: "Agriculture",
  OPEN_LAND_GODOWN: "Open Land / Godown",
  MANDIR: "Mandir",
  MASJID: "Masjid",
  TRUST_DHARAMSHALA: "Trust / Dharamshala",
  SHAMSHAN_KABRISTAN: "Shamshan / Kabristan",
  GURUDWARA_CHURCH: "Gurudwara / Church",

  // Legacy floor codes
  BASEMENT: "Basement",
  GROUND_FLOOR: "Ground Floor",
  FIRST_FLOOR: "First Floor",
  SECOND_FLOOR: "Second Floor",
  THIRD_FLOOR: "Third Floor",
  FOURTH_FLOOR: "Fourth Floor",
  FIFTH_FLOOR: "Fifth Floor",
  SIXTH_FLOOR: "Sixth Floor",
}

const SNAKE_CASE_RE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/

function titleCaseWord(word: string): string {
  if (!word) return word
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Known acronyms kept uppercase when humanizing snake_case. */
const ACRONYMS = new Set(["rcc", "rb", "hfa", "alv", "ulb", "gis"])

/** Humanize ALL_CAPS_SNAKE_CASE → Title Case With Spaces. */
export function humanizeSnakeCase(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase()
      if (ACRONYMS.has(lower)) return word.toUpperCase()
      return titleCaseWord(word)
    })
    .join(" ")
}

/**
 * Format a catalog / stored classification value for display.
 * Returns the original string when it is already human-readable Excel text.
 */
export function formatCatalogLabel(value?: string | null): string {
  const raw = value?.trim() ?? ""
  if (!raw) return ""

  if (EXACT_LABELS[raw]) return EXACT_LABELS[raw]

  // Case-insensitive exact match for messy catalog strings
  const lowerKey = Object.keys(EXACT_LABELS).find(
    (key) => key.toLowerCase() === raw.toLowerCase()
  )
  if (lowerKey) return EXACT_LABELS[lowerKey]!

  if (SNAKE_CASE_RE.test(raw)) return humanizeSnakeCase(raw)

  return raw
}

/** Display helper for optional fields (empty → em dash). */
export function formatCatalogDisplay(value?: string | null): string {
  const label = formatCatalogLabel(value)
  return label || "—"
}
