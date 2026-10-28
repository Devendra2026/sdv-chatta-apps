import { computeOutstandingAfterPayment } from "./offline-rules"
import {
  assessmentYearNameFromSnapshot,
  buildReceiptSnapshot,
  taxBreakdownFromReceiptSnapshot,
} from "./receipt-snapshot"

describe("apply payment to demand balance", () => {
  it("increments amountPaid and recomputes outstanding", () => {
    const balance = computeOutstandingAfterPayment(5000, 3000, 1500)
    expect(balance.amountPaid).toBe(4500)
    expect(balance.outstanding).toBe(500)
  })

  it("clamps outstanding at zero when payment covers the remainder", () => {
    const balance = computeOutstandingAfterPayment(5000, 4000, 1500)
    expect(balance.amountPaid).toBe(5500)
    expect(balance.outstanding).toBe(0)
  })

  it("allows another payment while outstanding > 0", () => {
    const afterFirst = computeOutstandingAfterPayment(5000, 0, 2000)
    expect(afterFirst.outstanding).toBe(3000)
    const afterSecond = computeOutstandingAfterPayment(
      5000,
      afterFirst.amountPaid,
      2000
    )
    expect(afterSecond.outstanding).toBe(1000)
  })
})

describe("receipt snapshot from demand", () => {
  it("stores tax heads and outstandingAfter for receipts", () => {
    const balance = computeOutstandingAfterPayment(3450, 0, 3450)
    const snapshot = buildReceiptSnapshot({
      propertyTax: 2000,
      waterTax: 500,
      drainageTax: 200,
      penalty: 100,
      rebate: 50,
      arrears: 700,
      currentDemand: 2750,
      totalPayable: 3450,
      amountReceived: 3450,
      outstandingAfter: balance.outstanding,
      amountPaidAfter: balance.amountPaid,
      assessmentYear: { id: "y1", code: "2025-26", name: "2025-2026" },
      surveyId: "survey-cuid",
      municipalSurveyId: "CHH-1",
      paymentMode: "ONLINE",
      receiptNumber: "RCP-CHH-1",
      paidAt: new Date("2026-04-10T12:00:00.000Z"),
    })

    expect(snapshot.outstandingAfter).toBe(0)
    expect(snapshot.amountReceived).toBe(3450)
    expect(taxBreakdownFromReceiptSnapshot(snapshot)).toEqual({
      propertyTax: 2000,
      waterTax: 500,
      drainageTax: 200,
      penalty: 100,
      totalDemand: 3450,
    })
    expect(assessmentYearNameFromSnapshot(snapshot)).toBe("2025-2026")
  })
})
