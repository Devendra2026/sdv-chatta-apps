import {
  pickLatestPublishedConfig,
  type TaxConfigForDues,
} from "../public-property-tax/dues.util"
import { taxConfigToRateTable } from "../reports/ward-tax-report-excel"
import { computeSurveyExportTax, toTaxNumber } from "../tax/tax-calc"
import {
  isResidentialUsage,
  mapConstructionCode,
  mapTaxRateZoneCode,
} from "../tax/tax-zone-map"

export type DashboardTaxSurvey = {
  id: string
  wardId: string
  propertyUse: string | null
  taxRateZone: string | null
  hasMunicipalWaterSupply: boolean | null
  plotAreaSqFt: { toString(): string } | number | null
  plinthAreaSqFt: { toString(): string } | number | null
  totalBuiltUpAreaSqFt: { toString(): string } | number | null
  floors: Array<{
    floorLabel: string
    usageType: string | null
    usageFactor: string | null
    buildingType: string | null
    areaSqFt: { toString(): string } | number | null
  }>
}

export type WardTaxDemand = {
  propertyTaxDemand: number
  waterTaxDemand: number
  drainageTaxDemand: number
  totalTaxDemand: number
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
  surveyedWithDemand: number
  skippedSurveys: number
}

export type TaxDemandAggregate = {
  propertyTaxDemand: number
  waterTaxDemand: number
  drainageTaxDemand: number
  totalTaxDemand: number
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
  byWard: Map<string, WardTaxDemand>
}

const EMPTY_WARD: WardTaxDemand = {
  propertyTaxDemand: 0,
  waterTaxDemand: 0,
  drainageTaxDemand: 0,
  totalTaxDemand: 0,
  propertyTaxPct: 0,
  waterTaxPct: 0,
  drainageTaxPct: 0,
  surveyedWithDemand: 0,
  skippedSurveys: 0,
}

function emptyWardDemand(rates?: {
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
}): WardTaxDemand {
  return {
    ...EMPTY_WARD,
    propertyTaxPct: rates?.propertyTaxPct ?? 0,
    waterTaxPct: rates?.waterTaxPct ?? 0,
    drainageTaxPct: rates?.drainageTaxPct ?? 0,
  }
}

/**
 * Aggregate Property / Water / Drainage tax demand from surveys + published
 * tax configs (latest assessment year per ward).
 * Surveys missing zone or config are skipped (counted in skippedSurveys).
 */
export function aggregateTaxDemand(input: {
  wardIds: string[]
  surveys: DashboardTaxSurvey[]
  configsByWardId: Map<string, TaxConfigForDues[]>
}): TaxDemandAggregate {
  const byWard = new Map<string, WardTaxDemand>()
  const rateTableByWard = new Map<
    string,
    ReturnType<typeof taxConfigToRateTable>
  >()

  for (const wardId of input.wardIds) {
    const published = input.configsByWardId.get(wardId) ?? []
    const config = pickLatestPublishedConfig(published)
    if (config) {
      const rates = taxConfigToRateTable(config)
      rateTableByWard.set(wardId, rates)
      byWard.set(
        wardId,
        emptyWardDemand({
          propertyTaxPct: rates.propertyTaxPct,
          waterTaxPct: rates.waterTaxPct,
          drainageTaxPct: rates.drainageTaxPct,
        })
      )
    } else {
      byWard.set(wardId, emptyWardDemand())
    }
  }

  for (const survey of input.surveys) {
    const current = byWard.get(survey.wardId) ?? emptyWardDemand()
    const rates = rateTableByWard.get(survey.wardId)
    if (!rates) {
      current.skippedSurveys += 1
      byWard.set(survey.wardId, current)
      continue
    }

    const zoneCode = mapTaxRateZoneCode(survey.taxRateZone)
    if (!zoneCode) {
      current.skippedSurveys += 1
      byWard.set(survey.wardId, current)
      continue
    }

    try {
      const floorInputs = survey.floors.map((f) => ({
        floorKey: f.floorLabel,
        constructionCode: mapConstructionCode(f.buildingType ?? f.usageType),
        usageResidential: isResidentialUsage(f.usageType, survey.propertyUse),
        areaSqFt: toTaxNumber(f.areaSqFt),
        usageType: f.usageType,
        usageFactor: f.usageFactor,
      }))

      const summary = computeSurveyExportTax({
        taxRateZoneCode: zoneCode,
        propertyUse: survey.propertyUse,
        hasMunicipalWater: survey.hasMunicipalWaterSupply,
        floors: floorInputs,
        plotAreaSqFt: toTaxNumber(survey.plotAreaSqFt),
        plinthAreaSqFt: toTaxNumber(survey.plinthAreaSqFt),
        totalBuiltUpAreaSqFt: toTaxNumber(survey.totalBuiltUpAreaSqFt),
        rates,
      })

      current.propertyTaxDemand = round2(
        current.propertyTaxDemand + summary.propertyTax
      )
      current.waterTaxDemand = round2(current.waterTaxDemand + summary.waterTax)
      current.drainageTaxDemand = round2(
        current.drainageTaxDemand + summary.drainageTax
      )
      current.totalTaxDemand = round2(
        current.propertyTaxDemand +
          current.waterTaxDemand +
          current.drainageTaxDemand
      )
      current.surveyedWithDemand += 1
      byWard.set(survey.wardId, current)
    } catch {
      current.skippedSurveys += 1
      byWard.set(survey.wardId, current)
    }
  }

  let propertyTaxDemand = 0
  let waterTaxDemand = 0
  let drainageTaxDemand = 0
  let labelRates: {
    propertyTaxPct: number
    waterTaxPct: number
    drainageTaxPct: number
  } | null = null

  for (const wardId of input.wardIds) {
    const row = byWard.get(wardId) ?? emptyWardDemand()
    propertyTaxDemand = round2(propertyTaxDemand + row.propertyTaxDemand)
    waterTaxDemand = round2(waterTaxDemand + row.waterTaxDemand)
    drainageTaxDemand = round2(drainageTaxDemand + row.drainageTaxDemand)
    if (
      !labelRates &&
      (row.propertyTaxPct > 0 || row.waterTaxPct > 0 || row.drainageTaxPct > 0)
    ) {
      labelRates = {
        propertyTaxPct: row.propertyTaxPct,
        waterTaxPct: row.waterTaxPct,
        drainageTaxPct: row.drainageTaxPct,
      }
    }
  }

  return {
    propertyTaxDemand,
    waterTaxDemand,
    drainageTaxDemand,
    totalTaxDemand: round2(
      propertyTaxDemand + waterTaxDemand + drainageTaxDemand
    ),
    propertyTaxPct: labelRates?.propertyTaxPct ?? 0,
    waterTaxPct: labelRates?.waterTaxPct ?? 0,
    drainageTaxPct: labelRates?.drainageTaxPct ?? 0,
    byWard,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
