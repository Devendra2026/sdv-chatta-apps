import { classifyGisUseCode, isResidentialUsage } from "./tax-zone-map"

describe("classifyGisUseCode", () => {
  it("returns null for missing or unparseable values", () => {
    expect(classifyGisUseCode(null)).toBeNull()
    expect(classifyGisUseCode("")).toBeNull()
    expect(classifyGisUseCode("SUR-1")).toBeNull()
  })

  it("maps R / C / O from a letter or Survey Id", () => {
    expect(classifyGisUseCode("R")).toBe("residential")
    expect(classifyGisUseCode("c")).toBe("commercial")
    expect(classifyGisUseCode("O")).toBe("open_land")
    expect(classifyGisUseCode("249044-001-000131-001-R")).toBe("residential")
    expect(classifyGisUseCode("249044-002-000001-001-C")).toBe("commercial")
    expect(classifyGisUseCode("249044-001-000300-001-O")).toBe("open_land")
  })

  it("treats unknown letters as residential", () => {
    expect(classifyGisUseCode("I")).toBe("residential")
    expect(classifyGisUseCode("M")).toBe("residential")
    expect(classifyGisUseCode("249044-001-000131-001-P")).toBe("residential")
  })
})

describe("isResidentialUsage", () => {
  it("lets GIS class override floor / property use text", () => {
    expect(isResidentialUsage("Commercial", "Residential", "residential")).toBe(
      true
    )
    expect(isResidentialUsage("Residential", "Residential", "commercial")).toBe(
      false
    )
    expect(isResidentialUsage("Residential", null, "open_land")).toBe(false)
  })

  it("falls back to usage text when GIS class is missing", () => {
    expect(isResidentialUsage("Commercial", "Residential")).toBe(false)
    expect(isResidentialUsage("Residential", "Residential")).toBe(true)
  })
})
