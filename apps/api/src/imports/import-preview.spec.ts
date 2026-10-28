import {
  areaPairInconsistent,
  collectAreaInconsistencyMessages,
  columnMapToJson,
  isAllowedChhataCity,
} from "./import-preview"
import { refineMappingFromHeaders, CHHATA_V1_38 } from "./column-maps"

describe("import-preview helpers", () => {
  it("allows Chhata and Chhata Rural cities only", () => {
    expect(isAllowedChhataCity("Chhata")).toBe(true)
    expect(isAllowedChhataCity("chhata rural")).toBe(true)
    expect(isAllowedChhataCity("")).toBe(true)
    expect(isAllowedChhataCity("Mathura")).toBe(false)
    expect(isAllowedChhataCity("Agra")).toBe(false)
  })

  it("flags sqft vs sqm inconsistency without changing values", () => {
    expect(areaPairInconsistent(1076, 100)).toBe(false)
    expect(areaPairInconsistent(500, 100)).toBe(true)
    expect(areaPairInconsistent(undefined, 100)).toBe(false)
    expect(
      collectAreaInconsistencyMessages({
        plotAreaSqFt: 10,
        plotAreaSqMeter: 100,
      })
    ).toEqual(["Plot area sq ft vs sq m look inconsistent"])
  })

  it("serializes column mapping including duplicate water indexes", () => {
    const headers = Array.from({ length: 38 }, (_, i) => `Col${i}`)
    headers[31] = "Is Muncipal Water Supply"
    headers[36] = "Is Muncipal Water Supply"
    headers[37] = "Is Muncipal Water Supply"
    const map = refineMappingFromHeaders(CHHATA_V1_38, headers)
    const json = columnMapToJson(map as unknown as Record<string, number>)
    expect(json.hasMunicipalWaterSupply).toBe(31)
    expect(json.hasAlternateWater).toBe(36)
    expect(json.waterSourceType).toBe(37)
  })
})
