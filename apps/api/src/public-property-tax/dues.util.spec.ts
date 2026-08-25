import { taxRateKey } from "../tax/tax-calc"
import {
  buildNoticeFloorLines,
  pickLatestPublishedConfig,
  type SurveyForDues,
  type TaxConfigForDues,
} from "./dues.util"

function sampleRatesConfig(): TaxConfigForDues {
  return {
    id: "cfg1",
    version: 1,
    assessablePct: 80,
    propertyTaxPct: 10,
    waterTaxPct: 5,
    drainageTaxPct: 3,
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
  }
}

describe("pickLatestPublishedConfig", () => {
  it("picks highest assessment year code", () => {
    const older = {
      ...sampleRatesConfig(),
      id: "old",
      assessmentYear: { id: "y0", code: "2024-25", name: "2024-2025" },
    }
    const newer = sampleRatesConfig()
    expect(pickLatestPublishedConfig([older, newer])?.id).toBe("cfg1")
  })

  it("returns null for empty list", () => {
    expect(pickLatestPublishedConfig([])).toBeNull()
  })
})

describe("buildNoticeFloorLines", () => {
  it("builds floor ALV lines from rates", () => {
    const survey: SurveyForDues = {
      id: "s1",
      surveyId: "SUR-1",
      ownerName: "Ram",
      mobile: "9876543210",
      propertyNo: "1",
      parcelNo: "2",
      houseNo: "3",
      streetName: null,
      locality: "Test",
      colony: null,
      city: "Chhata",
      pincode: null,
      propertyUse: "Residential",
      taxRateZone: "BELOW_9M",
      roadType: null,
      hasMunicipalWaterSupply: true,
      plotAreaSqFt: null,
      plinthAreaSqFt: null,
      totalBuiltUpAreaSqFt: null,
      ward: { number: 1, name: "Ward 1" },
      floors: [
        {
          floorLabel: "Ground",
          usageType: "Residential",
          usageFactor: "1",
          buildingType: "RCC",
          areaSqFt: 100,
        },
      ],
    }
    const rates = {
      assessablePct: 80,
      propertyTaxPct: 10,
      waterTaxPct: 5,
      drainageTaxPct: 3,
      penaltyPct: 0,
      rateByZoneAndConstruction: new Map([
        [taxRateKey("BELOW_9M", "PAKKA_BUILDING_WITH_RCC_ROOF"), 0.36],
      ]),
      anyRateByZone: new Map([["BELOW_9M", 0.36]]),
    }
    const lines = buildNoticeFloorLines(survey, rates)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.areaSqFt).toBe(100)
    expect(lines[0]?.rate).toBe(0.36)
    expect(lines[0]?.tax).toBeGreaterThan(0)
  })
})
