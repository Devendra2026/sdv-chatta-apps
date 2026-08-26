import {
  computeDataQuality,
  parseFloorsRaw,
  serializeFloorsRaw,
} from "./floors.util"

describe("parseFloorsRaw", () => {
  it("parses multi-floor Chhata blobs", () => {
    const raw =
      "Ground Floor - 408 SqFt - 37.90 SqMt || Usage Type - Residential || Usage Factor - Self Occupied || Usage Type - Pakka Building with R.C.C Roof or R.B. Roof, First Floor - 140 SqFt - 13.01 SqMt || Usage Type - Residential || Usage Factor - Self Occupied || Usage Type - Pakka Building with R.C.C Roof or R.B. Roof"

    const floors = parseFloorsRaw(raw)
    expect(floors).toHaveLength(2)
    expect(floors[0]?.floorLabel).toBe("Ground Floor")
    expect(floors[0]?.areaSqFt).toBe(408)
    expect(floors[0]?.areaSqMeter).toBe(37.9)
    expect(floors[0]?.usageType).toBe("Residential")
    expect(floors[1]?.floorLabel).toBe("First Floor")
    expect(floors[1]?.areaSqFt).toBe(140)
  })

  it("returns empty for blank input", () => {
    expect(parseFloorsRaw(null)).toEqual([])
    expect(parseFloorsRaw("")).toEqual([])
  })
})

describe("serializeFloorsRaw", () => {
  it("round-trips structured floors to Chhata blob", () => {
    const raw = serializeFloorsRaw([
      {
        floorLabel: "Ground Floor",
        areaSqFt: 408,
        areaSqMeter: 37.9,
        usageType: "Residential",
        usageFactor: "Self Occupied",
        buildingType: "Pakka Building with R.C.C Roof or R.B. Roof",
      },
      {
        floorLabel: "First Floor",
        areaSqFt: 140,
        areaSqMeter: 13.01,
        usageType: "Residential",
        usageFactor: "Self Occupied",
        buildingType: "Pakka Building with R.C.C Roof or R.B. Roof",
      },
    ])

    const floors = parseFloorsRaw(raw)
    expect(floors).toHaveLength(2)
    expect(floors[0]?.floorLabel).toBe("Ground Floor")
    expect(floors[0]?.areaSqFt).toBe(408)
    expect(floors[0]?.usageType).toBe("Residential")
    expect(floors[0]?.usageFactor).toBe("Self Occupied")
    expect(floors[0]?.buildingType).toBe(
      "Pakka Building with R.C.C Roof or R.B. Roof"
    )
    expect(floors[1]?.floorLabel).toBe("First Floor")
    expect(floors[1]?.areaSqFt).toBe(140)
  })
})

describe("computeDataQuality", () => {
  it("flags missing contact", () => {
    expect(computeDataQuality({ mobile: "0" })).toBe("MISSING_CONTACT")
  })

  it("flags complete records", () => {
    expect(
      computeDataQuality({
        mobile: "7895943909",
        propertyNo: "1",
        parcelNo: "2",
        plotAreaSqFt: 300,
      })
    ).toBe("COMPLETE")
  })
})
