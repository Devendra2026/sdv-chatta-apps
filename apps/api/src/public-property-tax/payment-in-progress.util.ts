import { PaymentStatus } from "@prisma/client"

/** How long an INITIATED/PENDING checkout blocks a new citizen order. */
export const CITIZEN_PAYMENT_IN_PROGRESS_WINDOW_MS = 15 * 60 * 1000

export type OpenCitizenPayment = {
  id: string
  status: PaymentStatus
  createdAt: Date
}

/**
 * True when an open (INITIATED/PENDING) payment for the same survey+year
 * was created within the abandonment window.
 */
export function hasRecentOpenCitizenPayment(
  openPayments: ReadonlyArray<OpenCitizenPayment>,
  now: Date = new Date(),
  windowMs: number = CITIZEN_PAYMENT_IN_PROGRESS_WINDOW_MS
): boolean {
  const cutoff = now.getTime() - windowMs
  return openPayments.some(
    (p) =>
      (p.status === PaymentStatus.INITIATED ||
        p.status === PaymentStatus.PENDING) &&
      p.createdAt.getTime() >= cutoff
  )
}
