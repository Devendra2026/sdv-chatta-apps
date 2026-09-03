import type { TaxConfigForDues } from "../public-property-tax/dues.util"
import { taxRateKey } from "../tax/tax-calc"
import {
  aggregateTaxDemand,
  type DashboardTaxSurvey,
} from "./dashboard-tax.util"

function sampleConfig(overrides?: Partial<TaxConfigForDues>): TaxConfigForDues {
  return {
    id: "cfg1",
    version: 1,
    assessablePct: 80,
    commercialAssessablePct: 80,
    propertyTaxPct: 10,
    waterTaxPct: 7.5,
    drainageTaxPct: 2.5,
    penaltyPct: 0,
    assessmentYear: { id: "y1", code: "2025-26", name: "2025-2026" },
    updatedAt: new Date("2026-01-01"),
    cells: [
      {
        roadWidthEntry: { code: "BELOW_9M" },
        constructionEntry: { code: "PAKKA_BUILDING_WITH_RCC_ROOF" },
        annualRatePerSqFt: 0.36,
      },
    ],
    ...overrides,
  }
}

function sampleSurvey(
  wardId: string,
  overrides?: Partial<DashboardTaxSurvey>
): DashboardTaxSurvey {
  return {
    id: "s1",
    surveyId: "249044-001-000001-001-R",
    wardId,
    propertyUse: "Residential",
    taxRateZone: "BELOW_9M",
    hasMunicipalWaterSupply: true,
    plotAreaSqFt: null,
    plinthAreaSqFt: null,
    totalBuiltUpAreaSqFt: null,
    floors: [
      {
        floorLabel: "Ground",
        usageType: "Residential",
        usageFactor: "1",
        buildingType: "RCC",
        areaSqFt: 100,
      },
    ],
    ...overrides,
  }
}

describe("aggregateTaxDemand", () => {
  it("sums property/water/drainage demand per ward and overall", () => {
    const wardId = "w1"
    const configsByWardId = new Map([[wardId, [sampleConfig()]]])
    const surveys = [sampleSurvey(wardId), sampleSurvey(wardId, { id: "s2" })]

    const result = aggregateTaxDemand({
      wardIds: [wardId, "w2"],
      surveys,
      configsByWardId,
    })

    // Single floor: ALV 100×0.36×12=432, assessable 345.6, property 34.56
    // water 7.5% of 345.6 = 25.92, drainage 2.5% = 8.64
    expect(result.byWard.get(wardId)?.propertyTaxDemand).toBeCloseTo(69.12, 2)
    expect(result.byWard.get(wardId)?.waterTaxDemand).toBeCloseTo(51.84, 2)
    expect(result.byWard.get(wardId)?.drainageTaxDemand).toBeCloseTo(17.28, 2)
    expect(result.propertyTaxDemand).toBeCloseTo(69.12, 2)
    expect(result.waterTaxDemand).toBeCloseTo(51.84, 2)
    expect(result.drainageTaxDemand).toBeCloseTo(17.28, 2)
    expect(result.propertyTaxPct).toBe(10)
    expect(result.waterTaxPct).toBe(7.5)
    expect(result.drainageTaxPct).toBe(2.5)
    expect(result.byWard.get(wardId)?.surveyedWithDemand).toBe(2)
    expect(result.byWard.get("w2")?.totalTaxDemand).toBe(0)
  })

  it("applies GIS Use Code C commercial rate multiplier", () => {
    const wardId = "w1"
    const result = aggregateTaxDemand({
      wardIds: [wardId],
      surveys: [
        sampleSurvey(wardId, {
          surveyId: "249044-001-000001-001-C",
        }),
      ],
      configsByWardId: new Map([[wardId, [sampleConfig()]]]),
    })
    // 100 × 0.72 × 12 × 80% = 691.2 → house 69.12, water 51.84, drainage 17.28
    expect(result.byWard.get(wardId)?.propertyTaxDemand).toBeCloseTo(69.12, 2)
    expect(result.byWard.get(wardId)?.waterTaxDemand).toBeCloseTo(51.84, 2)
    expect(result.byWard.get(wardId)?.drainageTaxDemand).toBeCloseTo(17.28, 2)
  })

  it("skips surveys without zone or published config", () => {
    const wardId = "w1"
    const result = aggregateTaxDemand({
      wardIds: [wardId],
      surveys: [
        sampleSurvey(wardId, { taxRateZone: null }),
        sampleSurvey(wardId, { id: "s2", wardId: "orphan" }),
      ],
      configsByWardId: new Map([[wardId, [sampleConfig()]]]),
    })

    expect(result.totalTaxDemand).toBe(0)
    expect(result.byWard.get(wardId)?.skippedSurveys).toBe(1)
  })

  it("exposes rate keys used by taxRateKey for matrix cells", () => {
    expect(taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF")).toBe(
      "BELOW_9M::PAKKA_BUILDING_WITH_RCC_ROOF"
    )
  })
})
