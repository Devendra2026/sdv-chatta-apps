import {
  amountsMatchWithinTolerance,
  buildPaymentCallbackIdempotencyKey,
} from "./payments.service"

describe("payment callback idempotency key", () => {
  it("is stable on merchTxnId even when atomTxnId changes", () => {
    const a = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    const b = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-10",
    })
    expect(a).toBe(b)
    expect(a).toBe("CHH-1")
  })

  it("is stable when atomTxnId arrives on a later callback", () => {
    const first = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
    })
    const later = buildPaymentCallbackIdempotencyKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
    })
    expect(first).toBe(later)
    expect(first).toBe("CHH-1")
  })

  it("prefers explicit idempotencyKey when provided", () => {
    expect(
      buildPaymentCallbackIdempotencyKey({
        idempotencyKey: "custom-key",
        merchTxnId: "CHH-1",
        atomTxnId: "ATM-9",
      })
    ).toBe("custom-key")
  })

  it("falls back to na when merchTxnId is missing", () => {
    expect(buildPaymentCallbackIdempotencyKey({})).toBe("na")
  })
})

describe("amountsMatchWithinTolerance", () => {
  it("accepts amounts within one paisa tolerance (sandbox and atom)", () => {
    expect(amountsMatchWithinTolerance(100, 100.009)).toBe(true)
    expect(amountsMatchWithinTolerance(100, 100.02)).toBe(false)
  })
})
