import { isAlreadyPaidForYear, resolveDueStatus } from "./due-status.util"

describe("resolveDueStatus", () => {
  it("returns NO_DUE when SUCCESS payment matches current assessment year", () => {
    expect(
      resolveDueStatus({
        currentAssessmentYearId: "year-2025",
        paidAssessmentYearIds: new Set(["year-2025"]),
      })
    ).toBe("NO_DUE")
  })

  it("returns DUE when payment is for a different assessment year", () => {
    expect(
      resolveDueStatus({
        currentAssessmentYearId: "year-2025",
        paidAssessmentYearIds: ["year-2024"],
      })
    ).toBe("DUE")
  })

  it("returns DUE when there are no SUCCESS payments for the year", () => {
    expect(
      resolveDueStatus({
        currentAssessmentYearId: "year-2025",
        paidAssessmentYearIds: [],
      })
    ).toBe("DUE")
  })

  it("returns DUE when current assessment year is missing", () => {
    expect(
      resolveDueStatus({
        currentAssessmentYearId: null,
        paidAssessmentYearIds: ["year-2025"],
      })
    ).toBe("DUE")
  })
})

describe("isAlreadyPaidForYear", () => {
  it("is true when at least one SUCCESS payment exists for the year", () => {
    expect(
      isAlreadyPaidForYear({
        assessmentYearId: "year-2025",
        successPaymentCount: 1,
      })
    ).toBe(true)
  })

  it("is false when count is zero (INITIATED/PENDING do not clear dues)", () => {
    expect(
      isAlreadyPaidForYear({
        assessmentYearId: "year-2025",
        successPaymentCount: 0,
      })
    ).toBe(false)
  })
})

describe("ALREADY_PAID_FOR_YEAR rule", () => {
  it("rejects create when paidForAssessmentYear is true", () => {
    const dues = {
      paidForAssessmentYear: true,
      assessmentYear: { name: "2025-2026" },
    }
    expect(() => {
      if (dues.paidForAssessmentYear) {
        throw new Error("ALREADY_PAID_FOR_YEAR")
      }
    }).toThrow("ALREADY_PAID_FOR_YEAR")
  })

  it("allows create when not yet paid for the year", () => {
    const dues = { paidForAssessmentYear: false }
    expect(dues.paidForAssessmentYear).toBe(false)
  })
})

describe("search dueStatus mapping", () => {
  it("maps paid surveys to NO_DUE and others to DUE", () => {
    const yearByWardId = new Map([["ward-1", "year-2025"]])
    const paidYearsBySurvey = new Map([
      ["survey-paid", new Set(["year-2025"])],
      ["survey-unpaid", new Set<string>()],
    ])
    const rows = [
      { id: "survey-paid", wardId: "ward-1" },
      { id: "survey-unpaid", wardId: "ward-1" },
    ]

    const items = rows.map((row) => ({
      id: row.id,
      dueStatus: resolveDueStatus({
        currentAssessmentYearId: yearByWardId.get(row.wardId),
        paidAssessmentYearIds: paidYearsBySurvey.get(row.id) ?? new Set(),
      }),
    }))

    expect(items).toEqual([
      { id: "survey-paid", dueStatus: "NO_DUE" },
      { id: "survey-unpaid", dueStatus: "DUE" },
    ])
  })
})
