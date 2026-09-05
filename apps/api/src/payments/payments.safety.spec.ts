import { PaymentStatus } from "@prisma/client"

import {
  canApplyRefundToPayment,
  isAtomRefundSuccess,
  redactSensitivePaymentPayload,
  shouldReprocessProcessedCallback,
  toClientGatewayResult,
} from "./payments.safety"

describe("shouldReprocessProcessedCallback", () => {
  it("returns duplicate for a second SUCCESS on an already-paid payment", () => {
    expect(
      shouldReprocessProcessedCallback({
        existingProcessed: true,
        newStatusIsSuccess: true,
        paymentStatus: PaymentStatus.SUCCESS,
      })
    ).toBe(false)
  })

  it("upgrades a processed PENDING callback to SUCCESS", () => {
    expect(
      shouldReprocessProcessedCallback({
        existingProcessed: true,
        newStatusIsSuccess: true,
        paymentStatus: PaymentStatus.PENDING,
      })
    ).toBe(true)
  })

  it("does not reprocess a later FAILED after SUCCESS", () => {
    expect(
      shouldReprocessProcessedCallback({
        existingProcessed: true,
        newStatusIsSuccess: false,
        paymentStatus: PaymentStatus.SUCCESS,
      })
    ).toBe(false)
  })
})

describe("isAtomRefundSuccess", () => {
  it("treats OTS0000 as success", () => {
    expect(isAtomRefundSuccess(true, "OTS0000")).toBe(true)
  })

  it("does not treat UNKNOWN as success", () => {
    expect(isAtomRefundSuccess(true, "UNKNOWN")).toBe(false)
  })

  it("is false when the HTTP response failed", () => {
    expect(isAtomRefundSuccess(false, "OTS0000")).toBe(false)
  })
})

describe("canApplyRefundToPayment", () => {
  it("applies balance only after a successful gateway refund", () => {
    expect(canApplyRefundToPayment(true)).toBe(true)
    expect(canApplyRefundToPayment(false)).toBe(false)
  })
})

describe("toClientGatewayResult", () => {
  it("strips encData from the staff/create response", () => {
    const result = toClientGatewayResult({
      encData: "SECRET-HEX",
      merchId: "317157",
      atomTokenId: "tok-1",
    })
    expect(result.encData).toBeUndefined()
    expect(result.atomTokenId).toBe("tok-1")
    expect(result.merchId).toBe("317157")
  })
})

describe("redactSensitivePaymentPayload", () => {
  it("removes cardDetails from nested callback JSON", () => {
    const redacted = redactSensitivePaymentPayload({
      payInstrument: {
        payModeSpecificData: {
          cardDetails: { cardNumber: "4111111111111111", cvv: "123" },
          subChannel: ["CC"],
        },
      },
      merchTxnId: "CHH-1",
    }) as {
      payInstrument: { payModeSpecificData: { cardDetails?: unknown } }
      merchTxnId: string
    }
    expect(redacted.payInstrument.payModeSpecificData.cardDetails).toBeUndefined()
    expect(redacted.merchTxnId).toBe("CHH-1")
  })
})
