import { taxConfigToRateTable } from "../reports/ward-tax-report-excel"
import {
  computeFloorAlv,
  computeSurveyExportTax,
  resolveAssessablePct,
  resolveEffectiveMonthlyRate,
  resolveSurveyGisUseClass,
  roundMoney,
  taxRateKey,
  toTaxNumber,
  type ExportTaxRateTable,
} from "../tax/tax-calc"
import {
  isResidentialUsage,
  mapConstructionCode,
  mapTaxRateZoneCode,
} from "../tax/tax-zone-map"
import { maskMobile } from "./masking.util"

export type NoticeFloorLine = {
  floorLabel: string
  usageType: string
  usageFactor: string
  construction: string
  areaSqFt: number
  rate: number
  alv: number
  tax: number
}

export type SurveyForDues = {
  id: string
  surveyId: string
  ownerName: string | null
  mobile: string | null
  propertyNo: string | null
  parcelNo: string | null
  houseNo: string | null
  streetName: string | null
  locality: string | null
  colony: string | null
  city: string | null
  pincode: string | null
  propertyUse: string | null
  taxRateZone: string | null
  roadType: string | null
  hasMunicipalWaterSupply: boolean | null
  plotAreaSqFt: { toString(): string } | number | null
  plinthAreaSqFt: { toString(): string } | number | null
  totalBuiltUpAreaSqFt: { toString(): string } | number | null
  ward: { number: number; name: string }
  floors: Array<{
    floorLabel: string
    usageType: string | null
    usageFactor: string | null
    buildingType: string | null
    areaSqFt: { toString(): string } | number | null
  }>
}

export type TaxConfigForDues = {
  id: string
  version: number
  assessablePct: { toString(): string }
  commercialAssessablePct?: { toString(): string } | null
  propertyTaxPct: { toString(): string }
  waterTaxPct: { toString(): string }
  drainageTaxPct: { toString(): string }
  penaltyPct: { toString(): string }
  assessmentYear: { id: string; code: string; name: string }
  cells: Array<{
    roadWidthEntry: { code: string }
    constructionEntry: { code: string }
    annualRatePerSqFt: { toString(): string }
  }>
  updatedAt: Date
}

export function pickLatestPublishedConfig(
  configs: TaxConfigForDues[]
): TaxConfigForDues | null {
  if (configs.length === 0) return null
  const sorted = [...configs].sort((a, b) => {
    const byCode = b.assessmentYear.code.localeCompare(a.assessmentYear.code)
    if (byCode !== 0) return byCode
    const byName = b.assessmentYear.name.localeCompare(a.assessmentYear.name)
    if (byName !== 0) return byName
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })
  return sorted[0] ?? null
}

export function buildNoticeFloorLines(
  survey: SurveyForDues,
  rates: ExportTaxRateTable
): NoticeFloorLine[] {
  const gisClass = resolveSurveyGisUseClass(null, survey.surveyId)
  const zoneCode = mapTaxRateZoneCode(survey.taxRateZone) ?? "BELOW_9M"
  const lines: NoticeFloorLine[] = []
  const assessableOpts = {
    residentialPct: rates.assessablePct,
    commercialPct: rates.commercialAssessablePct,
  }

  for (const floor of survey.floors) {
    const constructionCode = mapConstructionCode(
      floor.buildingType ?? floor.usageType
    )
    const areaSqFt = toTaxNumber(floor.areaSqFt)
    const baseRate =
      rates.rateByZoneAndConstruction.get(
        taxRateKey(zoneCode, constructionCode)
      ) ?? 0
    const annualRate = resolveEffectiveMonthlyRate(
      baseRate,
      floor.usageFactor,
      floor.usageType,
      survey.propertyUse,
      gisClass
    )
    const floorAssessablePct = resolveAssessablePct(
      survey.propertyUse,
      floor.usageType,
      floor.usageFactor,
      assessableOpts,
      gisClass
    )
    const { assessableAlv, propertyTax } = computeFloorAlv(
      areaSqFt,
      annualRate,
      floorAssessablePct,
      rates.propertyTaxPct
    )
    lines.push({
      floorLabel: floor.floorLabel || "—",
      usageType: floor.usageType ?? "—",
      usageFactor: floor.usageFactor ?? "—",
      construction: floor.buildingType ?? floor.usageType ?? "—",
      areaSqFt: roundMoney(areaSqFt),
      rate: annualRate,
      alv: assessableAlv,
      tax: propertyTax,
    })
  }

  const openLand =
    gisClass === "open_land" ||
    (gisClass == null &&
      String(survey.propertyUse ?? "")
        .toLowerCase()
        .includes("open"))
  if (lines.length === 0 && openLand) {
    const area =
      toTaxNumber(survey.plotAreaSqFt) ||
      toTaxNumber(survey.totalBuiltUpAreaSqFt) ||
      toTaxNumber(survey.plinthAreaSqFt)
    const annualRate =
      rates.rateByZoneAndConstruction.get(taxRateKey(zoneCode, "OPEN_LAND")) ??
      rates.anyRateByZone.get(zoneCode) ??
      0
    const { assessableAlv, propertyTax } = computeFloorAlv(
      area,
      annualRate,
      100,
      rates.propertyTaxPct
    )
    lines.push({
      floorLabel: "Open Land / Plot",
      usageType: survey.propertyUse ?? "Open Land",
      usageFactor: "—",
      construction: "OPEN_LAND",
      areaSqFt: roundMoney(area),
      rate: annualRate,
      alv: assessableAlv,
      tax: propertyTax,
    })
  }

  return lines
}

export function computePublicDuesPayload(
  survey: SurveyForDues,
  config: TaxConfigForDues
) {
  const rates = taxConfigToRateTable(config)
  const zoneCode = mapTaxRateZoneCode(survey.taxRateZone) ?? "BELOW_9M"
  const gisClass = resolveSurveyGisUseClass(null, survey.surveyId)
  const floorInputs = survey.floors.map((f) => ({
    floorKey: f.floorLabel,
    constructionCode: mapConstructionCode(f.buildingType ?? f.usageType),
    usageResidential: isResidentialUsage(
      f.usageType,
      survey.propertyUse,
      gisClass
    ),
    areaSqFt: toTaxNumber(f.areaSqFt),
    usageType: f.usageType,
    usageFactor: f.usageFactor,
  }))

  const summary = computeSurveyExportTax({
    taxRateZoneCode: zoneCode,
    propertyUse: survey.propertyUse,
    hasMunicipalWater: survey.hasMunicipalWaterSupply,
    surveyId: survey.surveyId,
    floors: floorInputs,
    plotAreaSqFt: toTaxNumber(survey.plotAreaSqFt),
    plinthAreaSqFt: toTaxNumber(survey.plinthAreaSqFt),
    totalBuiltUpAreaSqFt: toTaxNumber(survey.totalBuiltUpAreaSqFt),
    rates,
  })

  const floors = buildNoticeFloorLines(survey, rates)
  const annualBaseRate = (() => {
    for (const floor of survey.floors) {
      const constructionCode = mapConstructionCode(
        floor.buildingType ?? floor.usageType
      )
      const base =
        rates.rateByZoneAndConstruction.get(
          taxRateKey(zoneCode, constructionCode)
        ) ?? 0
      if (base > 0) return base
    }
    return typeof summary.plotRate === "number" ? summary.plotRate : null
  })()

  // #region agent log
  {
    const stubFloorCount = survey.floors.filter(
      (f) => toTaxNumber(f.areaSqFt) <= 0
    ).length
    const noticeAreaSum = floors.reduce((s, f) => s + f.areaSqFt, 0)
    fetch("http://127.0.0.1:7787/ingest/931237b4-c66c-490a-b4d4-33ab324d8e01", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "de1763",
      },
      body: JSON.stringify({
        sessionId: "de1763",
        runId: "pre-fix",
        hypothesisId: "A,C,D",
        location: "dues.util.ts:computePublicDuesPayload",
        message: "dues floor vs tax summary",
        data: {
          wardNumber: survey.ward.number,
          surveyIdSuffix: survey.surveyId.slice(-20),
          taxRateZone: survey.taxRateZone,
          zoneCode,
          floorCount: survey.floors.length,
          stubFloorCount,
          floorAreas: survey.floors.map((f) => toTaxNumber(f.areaSqFt)),
          floorLabels: survey.floors.map((f) => f.floorLabel),
          noticeAreaSum,
          noticeAlvSum: floors.reduce((s, f) => s + f.alv, 0),
          plot: toTaxNumber(survey.plotAreaSqFt),
          plinth: toTaxNumber(survey.plinthAreaSqFt),
          built: toTaxNumber(survey.totalBuiltUpAreaSqFt),
          propertyTax: summary.propertyTax,
          totalDemand: summary.totalDemand,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion

  return {
    id: survey.id,
    surveyId: survey.surveyId,
    wardNumber: survey.ward.number,
    wardName: survey.ward.name,
    ownerName: survey.ownerName,
    mobileMasked: maskMobile(survey.mobile),
    propertyNo: survey.propertyNo,
    parcelNo: survey.parcelNo,
    houseNo: survey.houseNo,
    streetName: survey.streetName,
    locality: survey.locality,
    colony: survey.colony,
    city: survey.city,
    pincode: survey.pincode,
    propertyUse: survey.propertyUse,
    taxRateZone: survey.taxRateZone,
    roadType: survey.roadType,
    assessmentYear: {
      id: config.assessmentYear.id,
      code: config.assessmentYear.code,
      name: config.assessmentYear.name,
    },
    taxConfig: {
      id: config.id,
      version: config.version,
    },
    floors,
    tax: {
      propertyTaxPct: rates.propertyTaxPct,
      waterTaxPct: rates.waterTaxPct,
      drainageTaxPct: rates.drainageTaxPct,
      penaltyPct: rates.penaltyPct,
      assessablePct: rates.assessablePct,
      commercialAssessablePct: rates.commercialAssessablePct,
      propertyTax: summary.propertyTax,
      waterTax: summary.waterTax,
      drainageTax: summary.drainageTax,
      penalty: summary.penalty,
      totalDemand: summary.totalDemand,
      annualBaseRate,
      configFound: true,
    },
  }
}
