export * from "./proxy-helpers.js"
export * from "./staff-roles.js"
export * from "./survey-id.js"

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export type ApiError = {
  success: false
  error: {
    code: string
    message: string
    requestId?: string
  }
}

export type PaginatedMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const PERMISSIONS = [
  "dashboard:read",
  "survey:read",
  "survey:create",
  "survey:update",
  "survey:delete",
  "survey:pii:read",
  "import:read",
  "import:create",
  "export:read",
  "export:create",
  "report:read",
  "report:export",
  "payment:read",
  "payment:create",
  "payment:update",
  "payment:offline:create",
  "payment:requery",
  "refund:create",
  "refund:read",
  "settlement:read",
  "user:read",
  "user:create",
  "user:update",
  "user:delete",
  "role:read",
  "role:create",
  "role:update",
  "role:delete",
  "permission:read",
  "settings:update",
  "audit:read",
  "file:read",
  "file:create",
] as const

export type PermissionCode = (typeof PERMISSIONS)[number]

/** Citizen public property-tax search (apps/web). */
export type PublicPropertyTaxSearchMode = "ward" | "propertyId" | "owner"

export type PublicPropertyTaxWard = {
  id: string
  code: string
  name: string
  number: number
}

export type PublicPropertyTaxResultItem = {
  id: string
  surveyId: string
  wardNumber: number
  wardName: string
  propertyNo: string | null
  parcelNo: string | null
  ownerNameMasked: string
  mobileMasked: string
  locality: string | null
}

export type PublicPropertyTaxSearchResult = {
  items: PublicPropertyTaxResultItem[]
  page: number
  pageSize: number
  total: number
}

export type PublicPropertyTaxDuesFloor = {
  floorLabel: string
  usageType: string
  usageFactor: string
  construction: string
  areaSqFt: number
  rate: number
  alv: number
  tax: number
}

export type PublicPropertyTaxDues = {
  id: string
  surveyId: string
  wardNumber: number
  wardName: string
  ownerName: string | null
  mobileMasked: string
  propertyNo: string | null
  parcelNo: string | null
  houseNo: string | null
  streetName: string | null
  locality: string | null
  colony: string | null
  city: string | null
  pincode: string | null
  propertyUse: string | null
  taxRateZone: string | null
  roadType: string | null
  assessmentYear: {
    id: string
    code: string
    name: string
  }
  taxConfig: {
    id: string
    version: number
  }
  floors: PublicPropertyTaxDuesFloor[]
  tax: {
    propertyTaxPct: number
    waterTaxPct: number
    drainageTaxPct: number
    penaltyPct: number
    assessablePct: number
    commercialAssessablePct?: number
    propertyTax: number
    waterTax: number
    drainageTax: number
    penalty: number
    totalDemand: number
    annualBaseRate: number | null
    configFound: boolean
  }
}

export type PublicPropertyTaxAipayCheckout = {
  mode: "aipay"
  atomTokenId: string
  merchId: string
  custEmail: string
  custMobile: string
  returnUrl: string
  cdnUrl: string
  /** Second arg to AtomPaynetz — "uat" or "prod" */
  env: "uat" | "prod"
}

export type PublicPropertyTaxPaymentCreateResult = {
  paymentId: string
  merchTxnId: string | null
  amount: number
  currency: string
  /** Sandbox / Non-Seamless redirect (optional when AIPay checkout is used). */
  redirectUrl?: string
  /** Atom AIPay widget — opens card / UPI / netbanking UI. */
  checkout?: PublicPropertyTaxAipayCheckout
  assessmentYear: string
  surveyId: string
}

export type PublicPropertyTaxPaymentStatus = {
  paymentId: string
  merchTxnId: string | null
  receiptNumber: string | null
  status: string
  amount: number
  currency: string
  payerMobileMasked: string
  /** Survey primary key (cuid) — use for dues/pay links */
  id: string | null
  /** Municipal survey / property id shown to citizens */
  surveyId: string | null
  wardNumber: number | null
  wardName: string | null
  propertyNo: string | null
  parcelNo: string | null
  createdAt: string
  updatedAt: string
}

export type PublicPropertyTaxReceipt = PublicPropertyTaxPaymentStatus & {
  paidAt: string
  assessmentYear: string | null
  ownerName: string | null
  ownerFatherName: string | null
  taxBreakdown: {
    propertyTax: number
    waterTax: number
    drainageTax: number
    penalty: number
    totalDemand: number
  } | null
  gateway: string | null
  atomTxnId: string | null
}

/** Staff portal offline / counter collection receipt (full PII — authenticated only). */
export type StaffPaymentReceipt = {
  paymentId: string
  paymentReference: string
  receiptNumber: string
  amount: number
  currency: string
  paymentMode: string
  status: string
  payerName: string | null
  payerMobile: string | null
  chequeDdReference: string | null
  remarks: string | null
  collectionDate: string
  collectedBy: { id: string; name: string } | null
  survey: {
    id: string
    surveyId: string
    ownerName: string | null
    ownerFatherName: string | null
    mobile: string | null
    propertyNo: string | null
    parcelNo: string | null
    houseNo: string | null
    streetName: string | null
    locality: string | null
    colony: string | null
    city: string | null
    pincode: string | null
    propertyUse: string | null
    taxRateZone: string | null
    roadType: string | null
    address: string | null
  } | null
  ward: {
    id: string
    number: number
    name: string
    code: string
  } | null
}
