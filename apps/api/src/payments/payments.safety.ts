import { PaymentStatus } from "@prisma/client"

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

function redactRecord(value: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === "cardDetails") continue
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
