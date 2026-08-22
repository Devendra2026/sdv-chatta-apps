import type { ExportTaxRateTable } from "../tax/tax-calc"
import { taxRateKey } from "../tax/tax-calc"
import {
  WARD_TAX_COLUMN_COUNT,
  WARD_TAX_HEADER_ROWS,
  buildWardTaxDataRow,
} from "./ward-tax-report-excel"

describe("ward-tax-report-excel", () => {
  it("has 48 columns in header rows", () => {
    for (const row of WARD_TAX_HEADER_ROWS) {
      expect(row.length).toBe(WARD_TAX_COLUMN_COUNT)
    }
  })

  it("matches fixture header labels at key indices", () => {
    const h2 = WARD_TAX_HEADER_ROWS[0]
    expect(h2[0]).toBe("S N")
    expect(h2[11]).toBe("Tax Rate Zone")
    expect(h2[26]).toBe("Total Demand")

    const h5 = WARD_TAX_HEADER_ROWS[3]
    expect(h5[26]).toBe("RCC")
    expect(h5[47]).toBe("")
    expect(WARD_TAX_HEADER_ROWS[2][47]).toBe("Total Tax")
  })

  it("builds data row with total tax column", () => {
    const rates: ExportTaxRateTable = {
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

    const row = buildWardTaxDataRow(
      {
        surveyId: "S1",
        ownerName: "Test",
        taxRateZone: "Below 9m",
        propertyUse: "Open Land",
        plotAreaSqFt: 300,
        floors: [],
      },
      1,
      rates
    ) as unknown[]

    expect(row.length).toBe(48)
    expect(row[47]).toBeGreaterThan(0)
  })
})
