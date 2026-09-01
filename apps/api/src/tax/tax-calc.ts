/** Pure tax helpers for ward demand reports and citizen dues. */

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export type AssessablePctOptions = {
  residentialPct: number
  commercialPct: number
}

/**
 * Resolve assessable % from property use / floor usage.
 * Residential → residentialPct; commercial/shop/godown → commercialPct;
 * open land → 100.
 */
export function resolveAssessablePct(
  propertyUse?: string | null,
  usageType?: string | null,
  usageFactor?: string | null,
  options: AssessablePctOptions = { residentialPct: 80, commercialPct: 80 }
): number {
  const key =
    `${usageFactor ?? ""} ${usageType ?? ""} ${propertyUse ?? ""}`.toLowerCase()
  if (key.includes("open")) return 100
  if (
    key.includes("commercial") ||
    key.includes("shop") ||
    key.includes("godown")
  ) {
    return options.commercialPct
  }
  return options.residentialPct
}

/**
 * Commercial / shop / godown usage doubles the matrix monthly rate on demand notices.
 * Residential and open land keep the published base rate.
 */
export function resolveUsageRateMult(
  usageFactor?: string | null,
  usageType?: string | null,
  propertyUse?: string | null
): number {
  const key =
    `${usageFactor ?? ""} ${usageType ?? ""} ${propertyUse ?? ""}`.toLowerCase()
  if (
    key.includes("commercial") ||
    key.includes("shop") ||
    key.includes("godown")
  ) {
    return 2
  }
  return 1
}

export function resolveEffectiveMonthlyRate(
  baseRate: number,
  usageFactor?: string | null,
  usageType?: string | null,
  propertyUse?: string | null
): number {
  return roundMoney(
    baseRate * resolveUsageRateMult(usageFactor, usageType, propertyUse)
  )
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
    const slot = slotForFloor(floor.floorKey, floor.usageResidential)
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
      input.propertyUse
    )

    const floorAssessablePct = resolveAssessablePct(
      input.propertyUse,
      floor.usageType,
      floor.usageFactor,
      assessableOpts
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
      const target = floor.usageResidential
        ? residentialTaxCells
        : nonResidentialTaxCells
      const offset = band === "RCC" ? 0 : band === "TEEN" ? 3 : 6
      target[offset] = annualRate
      target[offset + 2] = floorTax
    }
  }

  const openLand = String(input.propertyUse ?? "")
    .toLowerCase()
    .includes("open")
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
        assessableOpts
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
