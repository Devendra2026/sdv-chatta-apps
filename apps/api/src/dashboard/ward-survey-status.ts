/** Survey presence status for dashboard ward cards (not tax demand). */
export type WardSurveyStatus = "PENDING" | "COMPLETED"

/**
 * PENDING when the ward has no surveys; COMPLETED when it has at least one.
 * Tax demand / collections do not affect this status.
 */
export function wardSurveyStatus(surveyCount: number): WardSurveyStatus {
  return surveyCount > 0 ? "COMPLETED" : "PENDING"
}
