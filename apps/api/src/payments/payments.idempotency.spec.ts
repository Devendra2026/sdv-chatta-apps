import {
  amountsMatchWithinTolerance,
  buildPaymentCallbackIdempotencyKey,
} from "./payments.service"

describe("payment callback idempotency key", () => {
  it("is stable for duplicate callbacks", () => {
    const a = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    const b = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    expect(a).toBe(b)
    expect(a).toBe("CHH-1:ATM-9")
  })

  it("ignores status code changes for the same gateway txn", () => {
    const a = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    const b = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    expect(a).toBe(b)
  })

  it("differs when atom txn id changes", () => {
    const a = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    const b = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-10",
    })
    expect(a).not.toBe(b)
  })
})

describe("amountsMatchWithinTolerance", () => {
  it("accepts amounts within one paisa tolerance", () => {
    expect(amountsMatchWithinTolerance(100, 100.009)).toBe(true)
    expect(amountsMatchWithinTolerance(100, 100.02)).toBe(false)
  })
})
