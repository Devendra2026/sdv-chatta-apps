import {
  computeDemandTotals,
  computeFloorAlv,
  computeGisPreviewDemand,
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

  it("commercial doubles the matrix rate for tax and ALV", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.6],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.6]]),
    }
    const residential = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: true,
          areaSqFt: 420,
        },
      ],
      rates,
    })
    const commercial = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential Self",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: false,
          areaSqFt: 420,
          usageType: "Commercial",
        },
      ],
      rates,
    })
    // Residential: 420 × 0.6 × 12 × 80% = 2419.2 → tax 241.92
    expect(residential.propertyTax).toBe(241.92)
    // Commercial: 420 × 1.2 × 12 × 80% = 4838.4 → tax 483.84
    expect(commercial.propertyTax).toBe(483.84)
    expect(commercial.waterTax).toBe(362.88)
    expect(commercial.drainageTax).toBe(120.96)
    expect(commercial.totalDemand).toBe(967.68)
  })

  it("GIS Use Code C doubles the rate even when propertyUse is Residential", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.6],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.6]]),
    }
    const r = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential",
      surveyId: "249044-001-000131-001-C",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: true,
          areaSqFt: 420,
          usageType: "Residential",
        },
      ],
      rates,
    })
    expect(r.propertyTax).toBe(483.84)
    expect(r.waterTax).toBe(362.88)
    expect(r.drainageTax).toBe(120.96)
    expect(r.totalDemand).toBe(967.68)
  })

  it("GIS Use Code R does not double even when floor usage is Commercial", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.6],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.6]]),
    }
    const r = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential Self",
      gisUseCode: "R",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: false,
          areaSqFt: 420,
          usageType: "Commercial",
        },
      ],
      rates,
    })
    expect(r.propertyTax).toBe(241.92)
    expect(r.waterTax).toBe(181.44)
    expect(r.drainageTax).toBe(60.48)
    expect(r.totalDemand).toBe(483.84)
  })

  it("GIS Use Code P uses 100% assessable and zero water/drainage", () => {
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
      propertyUse: "Residential",
      gisUseCode: "P",
      floors: [],
      plotAreaSqFt: 300,
      rates,
    })
    expect(r.plotTax).toBe(129.6)
    expect(r.waterTax).toBe(0)
    expect(r.drainageTax).toBe(0)
    expect(r.totalDemand).toBe(129.6)
  })

  it("GIS Use Code M applies both residential and commercial per floor", () => {
    const rates = {
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.6],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.6]]),
    }
    const r = computeSurveyExportTax({
      taxRateZoneCode: "BELOW_9M",
      propertyUse: "Residential Self",
      surveyId: "249044-001-000200-001-M",
      floors: [
        {
          floorKey: "Ground",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: true,
          areaSqFt: 100,
          usageType: "Residential",
        },
        {
          floorKey: "First",
          constructionCode: "PAKKA_BUILDING_WITH_RCC_ROOF",
          usageResidential: false,
          areaSqFt: 100,
          usageType: "Commercial",
        },
      ],
      rates,
    })
    // Res: 100×0.6×12×80%×10% = 57.6; Comm: 100×1.2×12×80%×10% = 115.2
    expect(r.propertyTax).toBe(172.8)
    // Assessable: 576 + 1152 = 1728 → water 129.6, drainage 43.2
    expect(r.waterTax).toBe(129.6)
    expect(r.drainageTax).toBe(43.2)
    expect(r.totalDemand).toBe(345.6)
  })

  it("computeGisPreviewDemand applies C ×2 and P open-plot exemptions; M defaults residential", () => {
    const residential = computeGisPreviewDemand({
      areaSqFt: 100,
      baseMonthlyRate: 0.36,
      gisUseCode: "R",
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
    })
    expect(residential.effectiveMonthlyRate).toBe(0.36)
    expect(residential.demand).toBe(69.12)

    const commercial = computeGisPreviewDemand({
      areaSqFt: 100,
      baseMonthlyRate: 0.36,
      gisUseCode: "C",
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
    })
    expect(commercial.effectiveMonthlyRate).toBe(0.72)
    expect(commercial.demand).toBe(138.24)

    const open = computeGisPreviewDemand({
      areaSqFt: 300,
      baseMonthlyRate: 0.36,
      gisUseCode: "P",
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
    })
    expect(open.assessablePct).toBe(100)
    expect(open.waterTax).toBe(0)
    expect(open.drainageTax).toBe(0)
    expect(open.demand).toBe(129.6)

    const mixed = computeGisPreviewDemand({
      areaSqFt: 100,
      baseMonthlyRate: 0.36,
      gisUseCode: "M",
      assessablePct: 80,
      commercialAssessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 7.5,
      drainageTaxPct: 2.5,
      penaltyPct: 0,
    })
    expect(mixed.gisClass).toBe("mixed")
    expect(mixed.effectiveMonthlyRate).toBe(0.36)
    expect(mixed.demand).toBe(69.12)
  })
})
