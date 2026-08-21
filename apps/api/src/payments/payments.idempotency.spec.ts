describe("payment callback idempotency key", () => {
  function buildKey(payload: {
    merchTxnId?: string
    atomTxnId?: string
    statusCode?: string
    idempotencyKey?: string
  }) {
    return (
      payload.idempotencyKey ||
      `${payload.merchTxnId ?? "na"}:${payload.atomTxnId ?? "na"}:${payload.statusCode ?? "UNKNOWN"}`
    )
  }

  it("is stable for duplicate callbacks", () => {
    const a = buildKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
      statusCode: "OTS0000",
    })
    const b = buildKey({
      merchTxnId: "CHH-1",
      atomTxnId: "ATM-9",
      statusCode: "OTS0000",
    })
    expect(a).toBe(b)
  })

  it("differs when status changes", () => {
    const a = buildKey({ merchTxnId: "CHH-1", statusCode: "OTS0000" })
    const b = buildKey({ merchTxnId: "CHH-1", statusCode: "FAILED" })
    expect(a).not.toBe(b)
  })
})
