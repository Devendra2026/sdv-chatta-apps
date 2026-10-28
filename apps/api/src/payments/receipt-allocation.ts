import { roundMoney } from "../tax/tax-calc"

export type ReceiptAllocationInput = {
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  rebate: number
  arrears: number
  /** Cumulative amount paid after this payment (includes this payment). */
  amountPaidAfter: number
  amountReceived: number
  outstandingAfter: number
  assessmentYearName: string | null
}

export type ReceiptAllocationRow = {
  yearLabel: string
  propertyTax: number
  waterTax: number
  drainageTax: number
  penaltyAndInterest: number
  /** Portion of this payment applied to prior-year arrears (display only). */
  arrearsApplied: number
  amountApplied: number
  yearBalanceAfter: number
}

/**
 * Outstanding before this payment, derived from the frozen snapshot.
 * amountPaidBefore = amountPaidAfter - amountReceived
 * outstandingBefore = totalPayable - amountPaidBefore
 * equivalently: outstandingAfter + amountReceived (when no overpayment).
 */
export function outstandingBeforeFromSnapshot(input: {
  totalPayable: number
  amountPaidAfter: number
  amountReceived: number
  outstandingAfter: number
}): number {
  const amountPaidBefore = roundMoney(
    Math.max(0, input.amountPaidAfter - input.amountReceived)
  )
  const fromPayable = roundMoney(
    Math.max(0, input.totalPayable - amountPaidBefore)
  )
  const fromAfter = roundMoney(input.outstandingAfter + input.amountReceived)
  // Prefer payable-based when finite; fall back to after+received if totals disagree by rounding.
  if (Math.abs(fromPayable - fromAfter) <= 0.02) {
    return fromPayable
  }
  return fromAfter
}

/**
 * Display-only waterfall of how this payment was applied across tax heads.
 * Does not mutate PropertyDemand. Prior-year DemandArrear detail is not
 * reconstructed; unpaid arrears are applied first as a single bucket.
 */
export function buildReceiptAllocation(
  input: ReceiptAllocationInput
): ReceiptAllocationRow {
  const yearLabel =
    input.assessmentYearName?.trim() || "—"

  const amountPaidBefore = roundMoney(
    Math.max(0, input.amountPaidAfter - input.amountReceived)
  )

  // Net property tax after rebate (rebate reduces property head for allocation).
  const propertyNet = roundMoney(
    Math.max(0, input.propertyTax - Math.abs(input.rebate))
  )

  const heads: Array<{
    key: "arrears" | "propertyTax" | "waterTax" | "drainageTax" | "penalty"
    due: number
  }> = [
    { key: "arrears", due: roundMoney(Math.max(0, input.arrears)) },
    { key: "propertyTax", due: propertyNet },
    { key: "waterTax", due: roundMoney(Math.max(0, input.waterTax)) },
    { key: "drainageTax", due: roundMoney(Math.max(0, input.drainageTax)) },
    { key: "penalty", due: roundMoney(Math.max(0, input.penalty)) },
  ]

  // Skip already-paid amount across heads in waterfall order.
  let remainingPaidBefore = amountPaidBefore
  const unpaid: Record<(typeof heads)[number]["key"], number> = {
    arrears: 0,
    propertyTax: 0,
    waterTax: 0,
    drainageTax: 0,
    penalty: 0,
  }
  for (const head of heads) {
    const skip = Math.min(head.due, remainingPaidBefore)
    remainingPaidBefore = roundMoney(remainingPaidBefore - skip)
    unpaid[head.key] = roundMoney(head.due - skip)
  }

  let remainingPayment = roundMoney(Math.max(0, input.amountReceived))
  const applied: Record<(typeof heads)[number]["key"], number> = {
    arrears: 0,
    propertyTax: 0,
    waterTax: 0,
    drainageTax: 0,
    penalty: 0,
  }
  for (const head of heads) {
    const take = Math.min(unpaid[head.key], remainingPayment)
    applied[head.key] = roundMoney(take)
    remainingPayment = roundMoney(remainingPayment - take)
  }

  // Absorb 0.01 remainder onto the last positive applied head so sum matches payment.
  const sumApplied = roundMoney(
    applied.arrears +
      applied.propertyTax +
      applied.waterTax +
      applied.drainageTax +
      applied.penalty
  )
  const delta = roundMoney(input.amountReceived - sumApplied)
  if (Math.abs(delta) >= 0.005) {
    const order: Array<(typeof heads)[number]["key"]> = [
      "penalty",
      "drainageTax",
      "waterTax",
      "propertyTax",
      "arrears",
    ]
    for (const key of order) {
      if (applied[key] > 0 || unpaid[key] > 0 || key === "propertyTax") {
        applied[key] = roundMoney(applied[key] + delta)
        break
      }
    }
  }

  const amountApplied = roundMoney(
    applied.arrears +
      applied.propertyTax +
      applied.waterTax +
      applied.drainageTax +
      applied.penalty
  )

  return {
    yearLabel,
    propertyTax: applied.propertyTax,
    waterTax: applied.waterTax,
    drainageTax: applied.drainageTax,
    penaltyAndInterest: applied.penalty,
    arrearsApplied: applied.arrears,
    amountApplied,
    yearBalanceAfter: roundMoney(Math.max(0, input.outstandingAfter)),
  }
}
