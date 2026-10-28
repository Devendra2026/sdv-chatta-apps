import type { PaymentMode, Prisma } from "@prisma/client"

export type ReceiptSnapshot = {
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  rebate: number
  arrears: number
  currentDemand: number
  totalPayable: number
  amountReceived: number
  outstandingAfter: number
  amountPaidAfter: number
  assessmentYear: { id: string; code: string; name: string } | null
  surveyId: string | null
  municipalSurveyId: string | null
  paymentMode: PaymentMode | string
  receiptNumber: string
  paidAt: string
}

export function buildReceiptSnapshot(input: {
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  rebate: number
  arrears: number
  currentDemand: number
  totalPayable: number
  amountReceived: number
  outstandingAfter: number
  amountPaidAfter: number
  assessmentYear?: { id: string; code: string; name: string } | null
  surveyId?: string | null
  municipalSurveyId?: string | null
  paymentMode: PaymentMode | string
  receiptNumber: string
  paidAt?: Date | string
}): ReceiptSnapshot {
  const paidAt =
    input.paidAt instanceof Date
      ? input.paidAt.toISOString()
      : (input.paidAt ?? new Date().toISOString())

  return {
    propertyTax: num(input.propertyTax),
    waterTax: num(input.waterTax),
    drainageTax: num(input.drainageTax),
    penalty: num(input.penalty),
    rebate: num(input.rebate),
    arrears: num(input.arrears),
    currentDemand: num(input.currentDemand),
    totalPayable: num(input.totalPayable),
    amountReceived: num(input.amountReceived),
    outstandingAfter: num(input.outstandingAfter),
    amountPaidAfter: num(input.amountPaidAfter),
    assessmentYear: input.assessmentYear
      ? {
          id: input.assessmentYear.id,
          code: input.assessmentYear.code,
          name: input.assessmentYear.name,
        }
      : null,
    surveyId: input.surveyId ?? null,
    municipalSurveyId: input.municipalSurveyId ?? null,
    paymentMode: input.paymentMode,
    receiptNumber: input.receiptNumber,
    paidAt,
  }
}

export function receiptSnapshotToJson(
  snapshot: ReceiptSnapshot
): Prisma.InputJsonValue {
  return snapshot as unknown as Prisma.InputJsonValue
}

export function parseReceiptSnapshot(
  value: unknown
): ReceiptSnapshot | null {
  if (!value || typeof value !== "object") return null
  const s = value as Record<string, unknown>
  const propertyTax = Number(s.propertyTax)
  const waterTax = Number(s.waterTax)
  const drainageTax = Number(s.drainageTax)
  const penalty = Number(s.penalty)
  const totalPayable = Number(s.totalPayable)
  if (
    ![propertyTax, waterTax, drainageTax, penalty, totalPayable].every(
      Number.isFinite
    )
  ) {
    return null
  }
  return value as ReceiptSnapshot
}

export function taxBreakdownFromReceiptSnapshot(value: unknown): {
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  totalDemand: number
} | null {
  const snapshot = parseReceiptSnapshot(value)
  if (!snapshot) return null
  return {
    propertyTax: num(snapshot.propertyTax),
    waterTax: num(snapshot.waterTax),
    drainageTax: num(snapshot.drainageTax),
    penalty: num(snapshot.penalty),
    totalDemand: num(snapshot.totalPayable),
  }
}

export function assessmentYearNameFromSnapshot(value: unknown): string | null {
  const snapshot = parseReceiptSnapshot(value)
  const name = snapshot?.assessmentYear?.name?.trim()
  return name || null
}

function num(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null) return 0
  return typeof value === "number" ? value : Number(value)
}
