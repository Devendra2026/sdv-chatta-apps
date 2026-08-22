import {
  computeDemandTotals,
  computeFloorAlv,
  computeSurveyExportTax,
  roundMoney,
  taxRateKey,
} from "./tax-calc"

describe("tax-calc", () => {
  it("roundMoney", () => {
    expect(roundMoney(1.006)).toBe(1.01)
  })

  it("computeFloorAlv", () => {
    const r = computeFloorAlv(100, 0.36, 1, 80, 10)
    expect(r.grossAlv).toBe(36)
    expect(r.assessableAlv).toBe(28.8)
    expect(r.propertyTax).toBe(2.88)
  })

  it("computeDemandTotals", () => {
    const r = computeDemandTotals(100, 10, 5, 3, 2, true, true)
    expect(r.waterTax).toBe(5)
    expect(r.drainageTax).toBe(3)
    expect(r.penalty).toBe(0.2)
    expect(r.totalAnnualDemand).toBe(18.2)
  })

  it("computeSurveyExportTax open land plot", () => {
    const rates = {
      assessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 0,
      drainageTaxPct: 0,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "OPEN_LAND"), 0.36],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.36]]),
    }
    const r = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Open Land",
      floors: [],
      plotAreaSqFt: 300,
      rates,
    })
    expect(r.plotTax).toBe(8.64)
    expect(r.totalDemand).toBe(8.64)
  })
})
