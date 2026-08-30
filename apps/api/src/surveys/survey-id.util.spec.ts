import {
  buildSurveyIdFromRecord,
  generateSurveyId,
  normalizeGisUseCode,
  normalizeParcelNo,
  normalizePropertyNo,
  normalizeWardCode,
  parseGisSurveyId,
} from "@workspace/types"

describe("survey-id", () => {
  it("formats GIS survey id with zero-padding (Test 6)", () => {
    expect(
      generateSurveyId({
        ulbCode: "249044",
        wardNo: 1,
        parcelNo: "131",
        propertyNo: "1",
        gisUseCode: "r",
      })
    ).toBe("249044-001-000131-001-R")
  })

  it("normalizes individual components", () => {
    expect(normalizeWardCode(1)).toBe("001")
    expect(normalizeParcelNo("131")).toBe("000131")
    expect(normalizePropertyNo("1")).toBe("001")
    expect(normalizeGisUseCode("c")).toBe("C")
  })

  it("parses and rebuilds survey ids", () => {
    const id = "249044-001-000131-001-R"
    const parsed = parseGisSurveyId(id)
    expect(parsed).toEqual({
      ulbCode: "249044",
      wardNo: "001",
      parcelNo: "000131",
      propertyNo: "001",
      gisUseCode: "R",
    })
    expect(
      buildSurveyIdFromRecord({
        wardNumber: 1,
        parcelNo: "000131",
        propertyNo: "001",
        gisUseCode: "R",
      })
    ).toBe(id)
  })

  it("builds seed-style survey id from components (Test 8)", () => {
    const surveyId = generateSurveyId({
      ulbCode: "249044",
      wardNo: 1,
      parcelNo: "000131",
      propertyNo: "001",
      gisUseCode: "R",
    })
    expect(surveyId).toBe("249044-001-000131-001-R")
  })
})
