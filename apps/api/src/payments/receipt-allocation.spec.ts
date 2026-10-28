import { computeOutstandingAfterPayment } from "./offline-rules"
import {
  buildReceiptAllocation,
  outstandingBeforeFromSnapshot,
} from "./receipt-allocation"

describe("outstandingBeforeFromSnapshot", () => {
  it("matches offline outstanding math for a partial payment", () => {
    const totalPayable = 309.6
    const amountPaidBefore = 0
    const paymentAmount = 250
    const after = computeOutstandingAfterPayment(
      totalPayable,
      amountPaidBefore,
      paymentAmount
    )
    expect(after.outstanding).toBe(59.6)
    expect(after.amountPaid).toBe(250)

    const before = outstandingBeforeFromSnapshot({
      totalPayable,
      amountPaidAfter: after.amountPaid,
      amountReceived: paymentAmount,
      outstandingAfter: after.outstanding,
    })
    expect(before).toBe(309.6)
  })

  it("handles a prior partial payment", () => {
    const totalPayable = 500
    const after = computeOutstandingAfterPayment(totalPayable, 100, 150)
    const before = outstandingBeforeFromSnapshot({
      totalPayable,
      amountPaidAfter: after.amountPaid,
      amountReceived: 150,
      outstandingAfter: after.outstanding,
    })
    expect(before).toBe(400)
  })
})

describe("buildReceiptAllocation", () => {
  it("allocates reference-shaped heads without arrears", () => {
    const row = buildReceiptAllocation({
      propertyTax: 192,
      waterTax: 144,
      drainageTax: 0,
      penalty: 0,
      rebate: 26.4,
      arrears: 0,
      amountPaidAfter: 250,
      amountReceived: 250,
      outstandingAfter: 59.6,
      assessmentYearName: "2025-2026",
    })
    expect(row.yearLabel).toBe("2025-2026")
    expect(row.propertyTax).toBe(165.6)
    expect(row.waterTax).toBe(84.4)
    expect(row.drainageTax).toBe(0)
    expect(row.penaltyAndInterest).toBe(0)
    expect(row.arrearsApplied).toBe(0)
    expect(row.amountApplied).toBe(250)
    expect(row.yearBalanceAfter).toBe(59.6)
  })

  it("applies unpaid arrears first", () => {
    const row = buildReceiptAllocation({
      propertyTax: 100,
      waterTax: 50,
      drainageTax: 0,
      penalty: 0,
      rebate: 0,
      arrears: 80,
      amountPaidAfter: 100,
      amountReceived: 100,
      outstandingAfter: 130,
      assessmentYearName: "2025-2026",
    })
    expect(row.arrearsApplied).toBe(80)
    expect(row.propertyTax).toBe(20)
    expect(row.waterTax).toBe(0)
    expect(row.amountApplied).toBe(100)
  })

  it("absorbs a one-paise remainder onto the last head", () => {
    const row = buildReceiptAllocation({
      propertyTax: 10.01,
      waterTax: 10.01,
      drainageTax: 0,
      penalty: 0,
      rebate: 0,
      arrears: 0,
      amountPaidAfter: 20.01,
      amountReceived: 20.01,
      outstandingAfter: 0.01,
      assessmentYearName: "2025-2026",
    })
    expect(row.amountApplied).toBe(20.01)
    expect(
      Math.round(
        (row.propertyTax +
          row.waterTax +
          row.drainageTax +
          row.penaltyAndInterest +
          row.arrearsApplied) *
          100
      ) / 100
    ).toBe(20.01)
  })
})
