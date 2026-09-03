/** Pure tax helpers for ward demand reports and citizen dues. */

import { classifyGisUseCode, type GisUseClass } from "./tax-zone-map"

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export type AssessablePctOptions = {
  residentialPct: number
  commercialPct: number
}

function usageLooksCommercial(text: string): boolean {
  const key = text.toLowerCase()
  return (
    key.includes("commercial") ||
    key.includes("shop") ||
    key.includes("godown") ||
    key.includes("non-res")
  )
}

function usageLooksOpenLand(text: string): boolean {
  return text.toLowerCase().includes("open")
}

function usageLooksResidential(text: string): boolean {
  return text.toLowerCase().includes("residential")
}

/**
 * Floor Usage Type wins over property-wide Property Use.
 * Mixed GIS properties often have Property Use "Shops/Banks" while some
 * floors are Residential — those floors must keep the base rate (×1).
 */
function resolveHeuristicUsageKey(
  usageType?: string | null,
  usageFactor?: string | null,
  propertyUse?: string | null
): string {
  const floor = (usageType ?? "").trim()
  if (floor) return floor.toLowerCase()
  return `${usageFactor ?? ""} ${propertyUse ?? ""}`.toLowerCase().trim()
}

/**
 * Resolve assessable % from GIS Use Code when present, else property / floor usage.
 * Residential → residentialPct; commercial/shop/godown → commercialPct;
 * open land → 100.
 */
export function resolveAssessablePct(
  propertyUse?: string | null,
  usageType?: string | null,
  usageFactor?: string | null,
  options: AssessablePctOptions = { residentialPct: 80, commercialPct: 80 },
  gisUseClass?: GisUseClass | null
): number {
  if (gisUseClass === "open_land") return 100
  if (gisUseClass === "commercial") return options.commercialPct
  if (gisUseClass === "residential") return options.residentialPct
  // mixed or null → floor usage first, then property use
  const key = resolveHeuristicUsageKey(usageType, usageFactor, propertyUse)
  if (usageLooksOpenLand(key)) return 100
  if (usageLooksCommercial(key)) return options.commercialPct
  return options.residentialPct
}

/**
 * Commercial GIS Use Code (or shop/godown usage when GIS is missing) doubles
 * the matrix monthly rate. Residential and open land keep the published base.
 * For mixed GIS, each floor's Usage Type decides ×1 vs ×2 — not Property Use.
 */
export function resolveUsageRateMult(
  usageFactor?: string | null,
  usageType?: string | null,
  propertyUse?: string | null,
  gisUseClass?: GisUseClass | null
): number {
  if (gisUseClass === "commercial") return 2
  if (gisUseClass === "residential" || gisUseClass === "open_land") return 1
  // mixed or null → floor usage first, then property use
  const key = resolveHeuristicUsageKey(usageType, usageFactor, propertyUse)
  if (usageLooksCommercial(key)) return 2
  if (usageLooksResidential(key)) return 1
  return 1
}

export function resolveEffectiveMonthlyRate(
  baseRate: number,
  usageFactor?: string | null,
  usageType?: string | null,
  propertyUse?: string | null,
  gisUseClass?: GisUseClass | null
): number {
  return roundMoney(
    baseRate *
      resolveUsageRateMult(usageFactor, usageType, propertyUse, gisUseClass)
  )
}

export function resolveSurveyGisUseClass(
  gisUseCode?: string | null,
  surveyId?: string | null
): GisUseClass | null {
  return classifyGisUseCode(gisUseCode) ?? classifyGisUseCode(surveyId)
}

/**
 * Floor / plot ALV and house (property) tax.
 * Matrix rate is monthly ₹/sq ft; ×12 converts to annual gross ALV.
 * Water and drainage use the same assessable ALV (so they include ×12).
 */
export function computeFloorAlv(
  areaSqFt: number,
  monthlyRatePerSqFt: number,
  assessablePct: number,
  propertyTaxPct: number
): { grossAlv: number; assessableAlv: number; propertyTax: number } {
  const grossAlv = roundMoney(areaSqFt * monthlyRatePerSqFt * 12)
  const assessableAlv = roundMoney(grossAlv * (assessablePct / 100))
  const propertyTax = roundMoney(assessableAlv * (propertyTaxPct / 100))
  return { grossAlv, assessableAlv, propertyTax }
}

export function computeDemandTotals(
  totalAssessableAlv: number,
  propertyTax: number,
  waterTaxPct: number,
  drainageTaxPct: number,
  penaltyPct: number,
  includeWater: boolean,
  includeDrainage: boolean
): {
  waterTax: number
  drainageTax: number
  penalty: number
  totalAnnualDemand: number
} {
  const waterTax = includeWater
    ? roundMoney(totalAssessableAlv * (waterTaxPct / 100))
    : 0
  const drainageTax = includeDrainage
    ? roundMoney(totalAssessableAlv * (drainageTaxPct / 100))
    : 0
  const penalty =
    penaltyPct > 0 ? roundMoney(propertyTax * (penaltyPct / 100)) : 0
  const totalAnnualDemand = roundMoney(
    propertyTax + waterTax + drainageTax + penalty
  )
  return { waterTax, drainageTax, penalty, totalAnnualDemand }
}

/** Live Tax Rates preview: GIS Use Code drives rate ×2, assessable %, water/drainage. */
export function computeGisPreviewDemand(input: {
  areaSqFt: number
  baseMonthlyRate: number
  gisUseCode?: string | null
  assessablePct: number
  commercialAssessablePct: number
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
  penaltyPct: number
}): {
  gisClass: GisUseClass
  effectiveMonthlyRate: number
  assessablePct: number
  grossAlv: number
  assessableAlv: number
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  demand: number
} {
  const gisClass = classifyGisUseCode(input.gisUseCode ?? "R") ?? "residential"
  // Mix has no floor usage in preview → residential heuristics
  const rateGisClass = gisClass === "mixed" ? null : gisClass
  const effectiveMonthlyRate = resolveEffectiveMonthlyRate(
    input.baseMonthlyRate,
    null,
    null,
    null,
    rateGisClass
  )
  const assessablePct = resolveAssessablePct(
    null,
    null,
    null,
    {
      residentialPct: input.assessablePct,
      commercialPct: input.commercialAssessablePct,
    },
    rateGisClass
  )
  const { grossAlv, assessableAlv, propertyTax } = computeFloorAlv(
    input.areaSqFt,
    effectiveMonthlyRate,
    assessablePct,
    input.propertyTaxPct
  )
  const includeWater = gisClass !== "open_land"
  const { waterTax, drainageTax, penalty, totalAnnualDemand } =
    computeDemandTotals(
      assessableAlv,
      propertyTax,
      input.waterTaxPct,
      input.drainageTaxPct,
      input.penaltyPct,
      includeWater,
      includeWater
    )
  return {
    gisClass,
    effectiveMonthlyRate,
    assessablePct,
    grossAlv,
    assessableAlv,
    propertyTax,
    waterTax,
    drainageTax,
    penalty,
    demand: totalAnnualDemand,
  }
}

export function toTaxNumber(
  value: { toString(): string } | number | string | null | undefined
): number {
  if (value == null) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const parsed = Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

export type ExportTaxRateTable = {
  assessablePct: number
  commercialAssessablePct: number
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
  penaltyPct: number
  rateByZoneAndConstruction: Map<string, number>
  anyRateByZone: Map<string, number>
}

export type ExportTaxSummary = {
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  totalDemand: number
}

export function taxRateKey(zoneCode: string, constructionCode: string): string {
  return `${zoneCode}::${constructionCode}`
}

export type ExportTaxFloorInput = {
  floorKey: string
  constructionCode: string
  usageResidential: boolean
  areaSqFt: number
  usageType?: string | null
  usageFactor?: string | null
}

export function computeSurveyExportTax(input: {
  taxRateZoneCode: string
  propertyUse?: string | null
  hasMunicipalWater?: boolean | null
  gisUseCode?: string | null
  surveyId?: string | null
  floors: ExportTaxFloorInput[]
  plotAreaSqFt?: number | null
  plinthAreaSqFt?: number | null
  totalBuiltUpAreaSqFt?: number | null
  rates: ExportTaxRateTable
}): ExportTaxSummary & {
  floorAreaBySlot: number[]
  residentialTaxCells: Array<number | string>
  nonResidentialTaxCells: Array<number | string>
  plotRate: number | string
  plotTax: number | string
} {
  const zoneCode = input.taxRateZoneCode.trim()
  if (!zoneCode) {
    throw new Error("Survey tax rate zone is missing")
  }

  const {
    assessablePct: residentialAssessablePct,
    commercialAssessablePct,
    propertyTaxPct,
    waterTaxPct,
    drainageTaxPct,
    penaltyPct,
  } = input.rates

  const gisClass = resolveSurveyGisUseClass(input.gisUseCode, input.surveyId)

  const assessableOpts: AssessablePctOptions = {
    residentialPct: residentialAssessablePct,
    commercialPct: commercialAssessablePct,
  }

  const floorAreaBySlot = new Array<number>(8).fill(0)
  let propertyTax = 0
  let totalAssessableAlv = 0

  const residentialTaxCells: Array<number | string> = new Array(9).fill("-")
  const nonResidentialTaxCells: Array<number | string> = new Array(9).fill("-")

  const slotForFloor = (floorKey: string, residential: boolean): number => {
    const key = floorKey.toLowerCase()
    let base: number
    if (key.includes("basement")) base = 0
    else if (key.includes("ground")) base = 2
    else if (key.includes("first")) base = 4
    else if (key.includes("second")) base = 6
    else if (key.includes("third")) base = 6
    else return -1
    return base + (residential ? 0 : 1)
  }

  const constructionBand = (code: string): "RCC" | "TEEN" | "KACCHA" | null => {
    const c = code.toUpperCase()
    if (c.includes("PAKKA") || c.includes("RCC")) return "RCC"
    if (c.includes("TIN") || c.includes("TEEN") || c.includes("SHED"))
      return "TEEN"
    if (c.includes("KACCHA") || c.includes("KACHCHA")) return "KACCHA"
    return "RCC"
  }

  for (const floor of input.floors) {
    const usageResidential =
      gisClass === "residential"
        ? true
        : gisClass === "commercial" || gisClass === "open_land"
          ? false
          : floor.usageResidential
    const rateGisClass = gisClass === "mixed" ? null : gisClass
    const slot = slotForFloor(floor.floorKey, usageResidential)
    if (slot >= 0 && slot < 8) {
      floorAreaBySlot[slot] = roundMoney(
        (floorAreaBySlot[slot] ?? 0) + floor.areaSqFt
      )
    }

    const baseRate =
      input.rates.rateByZoneAndConstruction.get(
        taxRateKey(zoneCode, floor.constructionCode)
      ) ?? 0
    if (baseRate <= 0) continue

    const annualRate = resolveEffectiveMonthlyRate(
      baseRate,
      floor.usageFactor,
      floor.usageType,
      input.propertyUse,
      rateGisClass
    )

    const floorAssessablePct = resolveAssessablePct(
      input.propertyUse,
      floor.usageType,
      floor.usageFactor,
      assessableOpts,
      rateGisClass
    )
    const { assessableAlv, propertyTax: floorTax } = computeFloorAlv(
      floor.areaSqFt,
      annualRate,
      floorAssessablePct,
      propertyTaxPct
    )
    propertyTax = roundMoney(propertyTax + floorTax)
    totalAssessableAlv = roundMoney(totalAssessableAlv + assessableAlv)

    const band = constructionBand(floor.constructionCode)
    if (band) {
      const target = usageResidential
        ? residentialTaxCells
        : nonResidentialTaxCells
      const offset = band === "RCC" ? 0 : band === "TEEN" ? 3 : 6
      target[offset] = annualRate
      target[offset + 2] = floorTax
    }
  }

  const openLand =
    gisClass === "open_land" ||
    (gisClass == null &&
      String(input.propertyUse ?? "")
        .toLowerCase()
        .includes("open"))
  if (totalAssessableAlv === 0 && input.floors.length === 0) {
    const area =
      toTaxNumber(input.plotAreaSqFt) ||
      toTaxNumber(input.totalBuiltUpAreaSqFt) ||
      toTaxNumber(input.plinthAreaSqFt)
    const openCode = "OPEN_LAND"
    const annualRate =
      input.rates.rateByZoneAndConstruction.get(
        taxRateKey(zoneCode, openCode)
      ) ??
      input.rates.anyRateByZone.get(zoneCode) ??
      0
    if (annualRate > 0 && area > 0) {
      const floorAssessablePct = resolveAssessablePct(
        input.propertyUse,
        null,
        null,
        assessableOpts,
        gisClass
      )
      const { assessableAlv, propertyTax: floorTax } = computeFloorAlv(
        area,
        annualRate,
        floorAssessablePct,
        propertyTaxPct
      )
      propertyTax = floorTax
      totalAssessableAlv = assessableAlv
    }
  }

  // Water and drainage apply for all built properties; only open land is exempt.
  const includeWater = !openLand
  const includeDrainage = !openLand
  const { waterTax, drainageTax, penalty, totalAnnualDemand } =
    computeDemandTotals(
      totalAssessableAlv,
      propertyTax,
      waterTaxPct,
      drainageTaxPct,
      penaltyPct,
      includeWater,
      includeDrainage
    )

  let plotRate: number | string = "-"
  let plotTax: number | string = 0
  if (openLand) {
    const plotArea = toTaxNumber(input.plotAreaSqFt)
    const openCode = "OPEN_LAND"
    const annualRate =
      input.rates.rateByZoneAndConstruction.get(
        taxRateKey(zoneCode, openCode)
      ) ??
      input.rates.anyRateByZone.get(zoneCode) ??
      0
    if (plotArea > 0 && annualRate > 0) {
      const { propertyTax: pt } = computeFloorAlv(
        plotArea,
        annualRate,
        100,
        propertyTaxPct
      )
      plotRate = annualRate
      plotTax = pt
      propertyTax = pt
    }
  }

  const totalDemand = openLand ? toTaxNumber(plotTax) : totalAnnualDemand

  return {
    propertyTax,
    waterTax,
    drainageTax,
    penalty,
    totalDemand,
    floorAreaBySlot,
    residentialTaxCells,
    nonResidentialTaxCells,
    plotRate,
    plotTax,
  }
}
