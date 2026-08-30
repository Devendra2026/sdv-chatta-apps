import {
  diffSurveyChanges,
  formatAuditChange,
  surveyToAuditSnapshot,
} from "./survey-audit.util"

describe("survey-audit.util", () => {
  it("records only changed fields (Test 7)", () => {
    const before = surveyToAuditSnapshot({
      surveyId: "249044-001-000131-001-R",
      parcelNo: "000131",
      ownerName: "Kanheya",
    })
    const after = surveyToAuditSnapshot({
      surveyId: "249044-001-000145-001-R",
      parcelNo: "000145",
      ownerName: "Kanheya",
    })

    const diff = diffSurveyChanges(before, after)
    expect(diff.changes.map((c) => c.field)).toEqual(["surveyId", "parcelNo"])
    expect(formatAuditChange(diff.changes[0]!)).toBe(
      "Survey ID: 249044-001-000131-001-R → 249044-001-000145-001-R"
    )
    expect(formatAuditChange(diff.changes[1]!)).toBe(
      "Parcel No: 000131 → 000145"
    )
  })

  it("returns empty diff when nothing changed", () => {
    const snapshot = surveyToAuditSnapshot({
      ownerName: "Ram",
      parcelNo: "000131",
    })
    expect(diffSurveyChanges(snapshot, { ...snapshot }).changes).toHaveLength(0)
  })

  it("includes owner and survey id for combined parcel + owner change", () => {
    const before = surveyToAuditSnapshot({
      surveyId: "249044-001-000131-001-R",
      parcelNo: "000131",
      ownerName: "Kanheya",
      gisUseCode: "R",
    })
    const after = surveyToAuditSnapshot({
      surveyId: "249044-001-000145-001-R",
      parcelNo: "000145",
      ownerName: "Ram",
      gisUseCode: "R",
    })
    const fields = diffSurveyChanges(before, after).changes.map((c) => c.field)
    expect(fields).toContain("ownerName")
    expect(fields).toContain("parcelNo")
    expect(fields).toContain("surveyId")
  })
})
