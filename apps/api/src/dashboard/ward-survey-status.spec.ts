import { wardSurveyStatus } from "./ward-survey-status"

describe("wardSurveyStatus", () => {
  it("returns PENDING when surveyCount is 0", () => {
    expect(wardSurveyStatus(0)).toBe("PENDING")
  })

  it("returns COMPLETED when surveyCount is positive", () => {
    expect(wardSurveyStatus(1)).toBe("COMPLETED")
    expect(wardSurveyStatus(343)).toBe("COMPLETED")
  })
})
