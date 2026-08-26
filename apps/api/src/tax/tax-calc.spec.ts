import {
  computeDemandTotals,
  computeFloorAlv,
  computeSurveyExportTax,
  resolveAssessablePct,
  roundMoney,
  taxRateKey,
} from "./tax-calc"

describe("tax-calc", () => {
  it("roundMoney", () => {
    expect(roundMoney(1.006)).toBe(1.01)
  })

  it("resolveAssessablePct residential / commercial / open land", () => {
    expect(resolveAssessablePct("Residential", null, null)).toBe(80)
    expect(
      resolveAssessablePct("Commercial", null, null, {
        residentialPct: 80,
        commercialPct: 100,
      })
    ).toBe(100)
    expect(
      resolveAssessablePct("Commercial Shop", null, null, {
        residentialPct: 80,
        commercialPct: 80,
      })
    ).toBe(80)
    expect(resolveAssessablePct("Open Land", null, null)).toBe(100)
  })

  it("computeFloorAlv multiplies monthly rate by 12 for annual ALV", () => {
    const r = computeFloorAlv(100, 0.36, 80, 10)
    // gross = 100 × 0.36 × 12 = 432
    expect(r.grossAlv).toBe(432)
    expect(r.assessableAlv).toBe(345.6)
    expect(r.propertyTax).toBe(34.56)
  })

  it("computeDemandTotals applies water 7.5 and drainage 2.5 on assessable ALV", () => {
    const r = computeDemandTotals(100, 10, 7.5, 2.5, 0, true, true)
    expect(r.waterTax).toBe(7.5)
    expect(r.drainageTax).toBe(2.5)
    expect(r.penalty).toBe(0)
    expect(r.totalAnnualDemand).toBe(20)
  })

  it("computeSurveyExportTax open land plot uses 100% assessable and zero water/drainage", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
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
    // gross 300 × 0.36 × 12 = 1296, assessable 100% = 1296, house 10% = 129.6
    expect(r.plotTax).toBe(129.6)
    expect(r.waterTax).toBe(0)
    expect(r.drainageTax).toBe(0)
    expect(r.totalDemand).toBe(129.6)
  })

  it("computeSurveyExportTax residential floor with water and drainage", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.36],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.36]]),
    }
    const r = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential",
      hasMunicipalWater: true,
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: true,
          areaSqFt: 100,
          usageType: "Residential",
        },
      ],
      rates,
    })
    // gross 432, assessable 345.6, house 34.56, water 25.92, drainage 8.64
    expect(r.propertyTax).toBe(34.56)
    expect(r.waterTax).toBe(25.92)
    expect(r.drainageTax).toBe(8.64)
    expect(r.totalDemand).toBe(69.12)
  })

  it("charges water tax even when hasMunicipalWater is false", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.36],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.36]]),
    }
    const r = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential",
      hasMunicipalWater: false,
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: true,
          areaSqFt: 100,
          usageType: "Residential",
        },
      ],
      rates,
    })
    expect(r.waterTax).toBe(25.92)
    expect(r.drainageTax).toBe(8.64)
  })

  it("commercial does not double the rate", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 0,
      drainageTaxPct: 0,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.36],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.36]]),
    }
    const residential = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: true,
          areaSqFt: 100,
        },
      ],
      rates,
    })
    const commercial = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Commercial",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: false,
          areaSqFt: 100,
          usageType: "Commercial",
        },
      ],
      rates,
    })
    expect(commercial.propertyTax).toBe(residential.propertyTax)
  })
})
