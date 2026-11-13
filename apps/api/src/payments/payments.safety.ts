import { PaymentStatus } from "@prisma/client"

import {
  maskEmail,
  maskMobile,
} from "./providers/atom-diagnostics"
import type { CreatePaymentResult } from "./providers/payment-provider"

export function shouldReprocessProcessedCallback(input: {
  existingProcessed: boolean
  newStatusIsSuccess: boolean
  paymentStatus: PaymentStatus
}): boolean {
  if (!input.existingProcessed) return true
  if (!input.newStatusIsSuccess) return false
  return (
    input.paymentStatus !== PaymentStatus.SUCCESS &&
    input.paymentStatus !== PaymentStatus.REFUNDED &&
    input.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
  )
}

export function isAtomRefundSuccess(
  responseOk: boolean,
  statusCode: string
): boolean {
  return (
    responseOk &&
    (statusCode === "OTS0000" || statusCode.toUpperCase() === "SUCCESS")
  )
}

export function canApplyRefundToPayment(gatewaySuccess: boolean): boolean {
  return gatewaySuccess
}

export function toClientGatewayResult(
  result: CreatePaymentResult
): CreatePaymentResult {
  const safe = { ...result }
  delete safe.encData
  return safe
}

/** Keys removed entirely from persisted / logged gateway payloads. */
const REDACT_DROP_KEYS = new Set([
  "cardDetails",
  "password",
  "encData",
  "signature",
  "atomTokenId",
  "atomTokenID",
  "tokenId",
  "otp",
  "cvv",
  "cardNumber",
  "pan",
  "ATOM_PASSWORD",
  "ATOM_AES_REQUEST_KEY",
  "ATOM_AES_REQUEST_IV",
  "ATOM_AES_RESPONSE_KEY",
  "ATOM_AES_RESPONSE_IV",
  "ATOM_REQ_HASH_KEY",
  "ATOM_RESP_HASH_KEY",
  "ATOM_API_SECRET_KEY",
])

const EMAIL_KEYS = new Set([
  "custEmail",
  "customerEmail",
  "payerEmail",
  "email",
])

const MOBILE_KEYS = new Set([
  "custMobile",
  "customerMobile",
  "payerMobile",
  "mobile",
])

function redactRecord(value: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (REDACT_DROP_KEYS.has(key)) continue
    if (typeof child === "string") {
      if (EMAIL_KEYS.has(key)) {
        next[key] = maskEmail(child)
        continue
      }
      if (MOBILE_KEYS.has(key)) {
        next[key] = maskMobile(child)
        continue
      }
    }
    next[key] = redactSensitivePaymentPayload(child)
  }
  return next
}

export function redactSensitivePaymentPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => redactSensitivePaymentPayload(item))
  }
  if (typeof payload === "object" && payload !== null) {
    return redactRecord(payload as Record<string, unknown>)
  }
  return payload
}
