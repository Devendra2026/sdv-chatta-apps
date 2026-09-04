import {
  classifyGisUseCode,
  isResidentialUsage,
  mapTaxRateZoneCode,
} from "./tax-zone-map"

describe("mapTaxRateZoneCode", () => {
  it("maps Rate Zone 1–4 catalog labels to matrix row codes", () => {
    expect(mapTaxRateZoneCode("RATE ZONE 1 (Upto 9 Meters)")).toBe("BELOW_9M")
    expect(
      mapTaxRateZoneCode("RATE ZONE 2 (9 meters and upto 12 meters)")
    ).toBe("METER_9_TO_12")
    expect(
      mapTaxRateZoneCode("RATE ZONE 3 (12 Meters And Upto 24 Meters)")
    ).toBe("METER_12_TO_24")
    expect(mapTaxRateZoneCode("RATE ZONE 4 (Above 24 Meters)")).toBe(
      "ABOVE_24M"
    )
  })

  it("maps panel row labels and codes", () => {
    expect(mapTaxRateZoneCode("Below 9m")).toBe("BELOW_9M")
    expect(mapTaxRateZoneCode("9m to 12m")).toBe("METER_9_TO_12")
    expect(mapTaxRateZoneCode("12m to 24m")).toBe("METER_12_TO_24")
    expect(mapTaxRateZoneCode("Above 24m")).toBe("ABOVE_24M")
    expect(mapTaxRateZoneCode("BELOW_9M")).toBe("BELOW_9M")
    expect(mapTaxRateZoneCode("METER_9_TO_12")).toBe("METER_9_TO_12")
    expect(mapTaxRateZoneCode("METER_12_TO_24")).toBe("METER_12_TO_24")
    expect(mapTaxRateZoneCode("ABOVE_24M")).toBe("ABOVE_24M")
  })

  it("does not treat Zone 2/3 'upto' text as Zone 1", () => {
    expect(mapTaxRateZoneCode("Rate Zone 2")).toBe("METER_9_TO_12")
    expect(mapTaxRateZoneCode("zone 3")).toBe("METER_12_TO_24")
    expect(mapTaxRateZoneCode("upto 9 meters")).toBe("BELOW_9M")
  })

  it("maps numeric and RZ shorthand zone labels", () => {
    expect(mapTaxRateZoneCode("1")).toBe("BELOW_9M")
    expect(mapTaxRateZoneCode("2")).toBe("METER_9_TO_12")
    expect(mapTaxRateZoneCode("3")).toBe("METER_12_TO_24")
    expect(mapTaxRateZoneCode("4")).toBe("ABOVE_24M")
    expect(mapTaxRateZoneCode("RZ-1")).toBe("BELOW_9M")
    expect(mapTaxRateZoneCode("RZ 2")).toBe("METER_9_TO_12")
    expect(mapTaxRateZoneCode("Rate Zone: 3")).toBe("METER_12_TO_24")
  })

  it("returns null for empty values", () => {
    expect(mapTaxRateZoneCode(null)).toBeNull()
    expect(mapTaxRateZoneCode("")).toBeNull()
  })
})

describe("classifyGisUseCode", () => {
  it("returns null for missing or unparseable values", () => {
    expect(classifyGisUseCode(null)).toBeNull()
    expect(classifyGisUseCode("")).toBeNull()
    expect(classifyGisUseCode("SUR-1")).toBeNull()
  })

  it("maps R / C / M / P from a letter or Survey Id", () => {
    expect(classifyGisUseCode("R")).toBe("residential")
    expect(classifyGisUseCode("c")).toBe("commercial")
    expect(classifyGisUseCode("M")).toBe("mixed")
    expect(classifyGisUseCode("P")).toBe("open_land")
    expect(classifyGisUseCode("O")).toBe("open_land")
    expect(classifyGisUseCode("249044-001-000131-001-R")).toBe("residential")
    expect(classifyGisUseCode("249044-002-000001-001-C")).toBe("commercial")
    expect(classifyGisUseCode("249044-001-000200-001-M")).toBe("mixed")
    expect(classifyGisUseCode("249044-001-000300-001-P")).toBe("open_land")
    expect(classifyGisUseCode("249044-001-000300-001-O")).toBe("open_land")
  })

  it("treats unknown letters as residential", () => {
    expect(classifyGisUseCode("I")).toBe("residential")
    expect(classifyGisUseCode("249044-001-000131-001-X")).toBe("residential")
  })
})

describe("isResidentialUsage", () => {
  it("lets GIS class override floor / property use text for R/C/P", () => {
    expect(isResidentialUsage("Commercial", "Residential", "residential")).toBe(
      true
    )
    expect(isResidentialUsage("Residential", "Residential", "commercial")).toBe(
      false
    )
    expect(isResidentialUsage("Residential", null, "open_land")).toBe(false)
  })

  it("for mixed uses floor / property text (both R and C apply)", () => {
    expect(isResidentialUsage("Residential", null, "mixed")).toBe(true)
    expect(isResidentialUsage("Commercial", null, "mixed")).toBe(false)
    expect(isResidentialUsage("Residential", "Shops/Banks", "mixed")).toBe(true)
    expect(isResidentialUsage("Commercial", "Residential", "mixed")).toBe(false)
  })

  it("falls back to usage text when GIS class is missing", () => {
    expect(isResidentialUsage("Commercial", "Residential")).toBe(false)
    expect(isResidentialUsage("Residential", "Residential")).toBe(true)
  })
})
