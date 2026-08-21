import { detectPreset, extractWardNumber, parseBool, parseNumber } from "./column-maps"

describe("column-maps", () => {
  it("detects presets by column count", () => {
    expect(detectPreset(38)).toBe("chhata-v1-38")
    expect(detectPreset(55)).toBe("chhata-v2-55")
  })

  it("extracts ward numbers", () => {
    expect(extractWardNumber("वार्ड नंबर 2 - शेरगढ रोड़", "")).toBe(2)
    expect(extractWardNumber("", "249044-001-000001-001-R")).toBe(1)
  })

  it("parses sentinels safely", () => {
    expect(parseBool("N/A")).toBeUndefined()
    expect(parseBool("Yes")).toBe(true)
    expect(parseNumber("1,200.5")).toBe(1200.5)
    expect(parseNumber("null")).toBeUndefined()
  })
})
