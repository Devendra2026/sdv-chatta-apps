import { BadRequestException } from "@nestjs/common"

/**
 * Pure year-end helpers mirrored from DemandsService rules for unit coverage.
 */
function assertDistinctYears(fromYearId: string, toYearId: string) {
  if (fromYearId === toYearId) {
    throw new BadRequestException(
      "fromYearId and toYearId must be different assessment years"
    )
  }
}

function applyArrearCarry(
  existingSourceYearIds: string[],
  sourceYearId: string,
  amount: number,
  currentDemand: number,
  amountPaid: number,
  existingArrearsSum: number
) {
  if (existingSourceYearIds.includes(sourceYearId)) {
    return {
      skipped: true as const,
      arrears: existingArrearsSum,
      totalPayable: currentDemand + existingArrearsSum,
      outstanding: Math.max(0, currentDemand + existingArrearsSum - amountPaid),
    }
  }
  const arrears = existingArrearsSum + amount
  const totalPayable = currentDemand + arrears
  return {
    skipped: false as const,
    arrears,
    totalPayable,
    outstanding: Math.max(0, totalPayable - amountPaid),
  }
}

describe("year-end carry-forward rules", () => {
  it("rejects same from/to year", () => {
    expect(() => assertDistinctYears("y1", "y1")).toThrow(BadRequestException)
  })

  it("carries outstanding once per source year", () => {
    const first = applyArrearCarry([], "y1", 2000, 0, 0, 0)
    expect(first.skipped).toBe(false)
    expect(first.outstanding).toBe(2000)

    const second = applyArrearCarry(["y1"], "y1", 2000, 0, 0, 2000)
    expect(second.skipped).toBe(true)
    expect(second.outstanding).toBe(2000)
  })

  it("adds arrears onto next-year current demand", () => {
    const r = applyArrearCarry([], "y1", 1500, 4000, 1000, 0)
    expect(r.arrears).toBe(1500)
    expect(r.totalPayable).toBe(5500)
    expect(r.outstanding).toBe(4500)
  })
})
