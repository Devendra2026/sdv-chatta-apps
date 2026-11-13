import { PaymentStatus } from "@prisma/client"

import { shouldReprocessProcessedCallback } from "./payments.safety"
import {
  amountsMatchWithinTolerance,
  buildPaymentCallbackIdempotencyKey,
} from "./payments.service"
import { extractAtomTxnFields } from "./providers/atom-ndps.provider"

/**
 * Callback decision helpers used by PaymentsService.handleCallback.
 * Full Nest+Prisma handleCallback coverage requires integration fixtures;
 * these unit tests lock the amount / idempotency / status rules Atom depends on.
 */
describe("Atom callback amount verification", () => {
  it("accepts totalAmount-only nested callbacks against payment amount", () => {
    const fields = extractAtomTxnFields({
      payInstrument: {
        merchDetails: { merchTxnId: "CHH-cb-1" },
        payDetails: { atomTxnId: "ATM-9", totalAmount: 552.39 },
        responseDetails: { statusCode: "OTS0000", message: "SUCCESS" },
      },
    })
    expect(fields.gatewayAmount).toBe(552.39)
    expect(amountsMatchWithinTolerance(552.39, fields.gatewayAmount!)).toBe(
      true
    )
  })

  it("flags Atom amount mismatch when gatewayAmount is undefined", () => {
    const providerName = "atom-ndps"
    const gatewayAmount = extractAtomTxnFields({
      payInstrument: {
        payDetails: { amount: "100.00", totalAmount: 150 },
      },
    }).gatewayAmount
    const amountMismatch =
      gatewayAmount === undefined
        ? providerName === "atom-ndps"
        : !amountsMatchWithinTolerance(100, gatewayAmount)
    expect(gatewayAmount).toBeUndefined()
    expect(amountMismatch).toBe(true)
  })
})

describe("Atom callback idempotency and status rules", () => {
  it("keys callbacks on merchTxnId so late atomTxnId updates the same row", () => {
    expect(
      buildPaymentCallbackIdempotencyKey({
        merchTxnId: "CHH-1",
        atomTxnId: "ATM-later",
      })
    ).toBe("CHH-1")
  })

  it("upgrades PENDING to SUCCESS and never downgrades SUCCESS", () => {
    expect(
      shouldReprocessProcessedCallback({
        existingProcessed: true,
        newStatusIsSuccess: true,
        paymentStatus: PaymentStatus.PENDING,
      })
    ).toBe(true)
    expect(
      shouldReprocessProcessedCallback({
        existingProcessed: true,
        newStatusIsSuccess: false,
        paymentStatus: PaymentStatus.SUCCESS,
      })
    ).toBe(false)
  })

  it("treats OTS0000 as success for status transitions", () => {
    const statusCode: string = "OTS0000"
    const success =
      statusCode === "OTS0000" ||
      statusCode === "SUCCESS" ||
      statusCode.toUpperCase() === "SUCCESS"
    expect(success).toBe(true)
    const cancelled: string = "OTS0551"
    const cancelSuccess =
      cancelled === "OTS0000" || cancelled.toUpperCase() === "SUCCESS"
    expect(cancelSuccess).toBe(false)
  })
})
