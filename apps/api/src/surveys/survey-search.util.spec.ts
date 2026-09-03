import { buildSurveySearchOr } from "./survey-search.util"

describe("buildSurveySearchOr", () => {
  it("returns empty for blank search", () => {
    expect(buildSurveySearchOr("")).toEqual([])
    expect(buildSurveySearchOr("   ")).toEqual([])
  })

  it("adds padded parcel equals for digit-like queries", () => {
    const or = buildSurveySearchOr("131")
    expect(or).toEqual(
      expect.arrayContaining([
        { parcelNo: { contains: "131", mode: "insensitive" } },
        { parcelNo: { equals: "000131", mode: "insensitive" } },
      ])
    )
  })

  it("adds exact surveyId equals when query contains hyphen", () => {
    const id = "249044-001-000131-001-R"
    const or = buildSurveySearchOr(id)
    expect(or).toEqual(
      expect.arrayContaining([
        { surveyId: { equals: id, mode: "insensitive" } },
        { surveyId: { contains: id, mode: "insensitive" } },
      ])
    )
  })

  it("does not pad owner-name searches", () => {
    const or = buildSurveySearchOr("Ram")
    expect(
      or.some(
        (clause) =>
          "parcelNo" in clause &&
          typeof clause.parcelNo === "object" &&
          clause.parcelNo !== null &&
          "equals" in clause.parcelNo
      )
    ).toBe(false)
  })
})
