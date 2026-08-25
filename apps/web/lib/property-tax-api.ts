import type {
  PublicPropertyTaxDues,
  PublicPropertyTaxPaymentCreateResult,
  PublicPropertyTaxPaymentStatus,
  PublicPropertyTaxReceipt,
  PublicPropertyTaxSearchMode,
  PublicPropertyTaxSearchResult,
  PublicPropertyTaxWard,
} from "@workspace/types"

import { publicApiGet, publicApiPost } from "./public-api"

export type PropertyTaxSearchParams = {
  mode: PublicPropertyTaxSearchMode
  wardNumber?: number
  propertyNo?: string
  propertyId?: string
  ownerName?: string
  mobile?: string
  page?: number
  pageSize?: number
}

export function fetchPublicWards() {
  return publicApiGet<PublicPropertyTaxWard[]>(
    "/api/v1/public/property-tax/wards"
  )
}

export function searchPublicProperties(params: PropertyTaxSearchParams) {
  const qs = new URLSearchParams()
  qs.set("mode", params.mode)
  if (params.wardNumber != null) qs.set("wardNumber", String(params.wardNumber))
  if (params.propertyNo) qs.set("propertyNo", params.propertyNo)
  if (params.propertyId) qs.set("propertyId", params.propertyId)
  if (params.ownerName) qs.set("ownerName", params.ownerName)
  if (params.mobile) qs.set("mobile", params.mobile)
  qs.set("page", String(params.page ?? 1))
  qs.set("pageSize", String(params.pageSize ?? 10))

  return publicApiGet<PublicPropertyTaxSearchResult>(
    `/api/v1/public/property-tax/search?${qs.toString()}`
  )
}

export function fetchPublicPropertyDues(surveyId: string) {
  return publicApiGet<PublicPropertyTaxDues>(
    `/api/v1/public/property-tax/dues/${encodeURIComponent(surveyId)}`
  )
}

export function createPublicPropertyTaxPayment(input: {
  surveyId: string
  payerMobile: string
  payerEmail?: string
}) {
  return publicApiPost<PublicPropertyTaxPaymentCreateResult>(
    "/api/v1/public/property-tax/payments",
    input
  )
}

export function fetchPublicPaymentStatus(merchTxnId: string, sync = true) {
  const qs = sync ? "?sync=1" : ""
  return publicApiGet<PublicPropertyTaxPaymentStatus>(
    `/api/v1/public/property-tax/payments/by-merch/${encodeURIComponent(merchTxnId)}${qs}`
  )
}

export function fetchPublicPaymentReceipt(merchTxnId: string) {
  return publicApiGet<PublicPropertyTaxReceipt>(
    `/api/v1/public/property-tax/receipts/${encodeURIComponent(merchTxnId)}`
  )
}
