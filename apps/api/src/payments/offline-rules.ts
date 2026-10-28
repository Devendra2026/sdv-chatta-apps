import { BadRequestException } from "@nestjs/common"
import { PaymentMode } from "@prisma/client"

/** Offline modes accepted at the counter (not gateway ONLINE). */
export const OFFLINE_PAYMENT_MODES = new Set<PaymentMode>([
  PaymentMode.CASH,
  PaymentMode.CHEQUE,
  PaymentMode.DD,
  PaymentMode.UPI_MANUAL,
  PaymentMode.OTHER,
])

export const MODES_REQUIRING_REFERENCE = new Set<PaymentMode>([
  PaymentMode.CHEQUE,
  PaymentMode.DD,
  PaymentMode.UPI_MANUAL,
])

const AMOUNT_EPS = 0.005

export function assertOfflinePaymentMode(mode: PaymentMode): void {
  if (mode === PaymentMode.ONLINE) {
    throw new BadRequestException("Use online endpoint for gateway payments")
  }
  if (!OFFLINE_PAYMENT_MODES.has(mode)) {
    throw new BadRequestException({
      code: "INVALID_PAYMENT_MODE",
      message: "Unsupported offline payment mode",
    })
  }
}

export function assertOfflineReference(
  mode: PaymentMode,
  chequeDdReference?: string | null
): void {
  if (
    MODES_REQUIRING_REFERENCE.has(mode) &&
    !chequeDdReference?.trim()
  ) {
    throw new BadRequestException({
      code: "REFERENCE_REQUIRED",
      message:
        "Cheque / DD / UPI reference is required for this payment mode",
    })
  }
}

/**
 * Amount must be > 0 and <= demand outstanding (published demand required).
 */
export function assertOfflineAmountAgainstOutstanding(
  amount: number,
  outstanding: number
): void {
  if (!Number.isFinite(amount) || !(amount > 0)) {
    throw new BadRequestException({
      code: "INVALID_AMOUNT",
      message: "Payment amount must be greater than zero",
    })
  }
  if (!Number.isFinite(outstanding) || outstanding <= 0) {
    throw new BadRequestException({
      code: "NO_OUTSTANDING",
      message: "This property has no outstanding dues for the published demand",
    })
  }
  if (amount > outstanding + AMOUNT_EPS) {
    throw new BadRequestException({
      code: "AMOUNT_EXCEEDS_OUTSTANDING",
      message: `Payment amount (₹${amount.toFixed(2)}) cannot exceed outstanding dues (₹${outstanding.toFixed(2)})`,
    })
  }
}

export function assertPublishedDemandPresent(demand: {
  status: string
} | null): asserts demand is { status: string } {
  if (!demand || demand.status !== "PUBLISHED") {
    throw new BadRequestException({
      code: "DEMAND_UNPUBLISHED",
      message:
        "No published property demand for this survey and assessment year. Publish the demand before recording offline payment.",
    })
  }
}

export function computeOutstandingAfterPayment(
  totalPayable: number,
  amountPaidBefore: number,
  paymentAmount: number
): { amountPaid: number; outstanding: number } {
  const amountPaid = roundMoney(amountPaidBefore + paymentAmount)
  const outstanding = roundMoney(Math.max(0, totalPayable - amountPaid))
  return { amountPaid, outstanding }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}
