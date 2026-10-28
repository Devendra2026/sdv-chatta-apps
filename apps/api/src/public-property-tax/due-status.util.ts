export type PublicPropertyTaxDueStatus = "DUE" | "NO_DUE"

/**
 * Prefer demand outstanding when a published PropertyDemand exists.
 * Legacy (no demand): NO_DUE when a SUCCESS payment exists for the year.
 *
 * Legacy note: any SUCCESS still clears the year when no demand row exists.
 * Sum(amount) vs demand would be more accurate but needs live totalDemand;
 * keep boolean SUCCESS path so production without published demands still works.
 */
export function resolveDueStatus(input: {
  currentAssessmentYearId: string | null | undefined
  paidAssessmentYearIds: ReadonlySet<string> | ReadonlyArray<string>
  /** When set for the current year, outstanding drives DUE / NO_DUE. */
  outstanding?: number | null
  hasPublishedDemand?: boolean
}): PublicPropertyTaxDueStatus {
  const yearId = input.currentAssessmentYearId?.trim()
  if (!yearId) return "DUE"

  if (input.hasPublishedDemand) {
    const outstanding = Number(input.outstanding ?? 0)
    return Number.isFinite(outstanding) && outstanding <= 0 ? "NO_DUE" : "DUE"
  }

  const paid =
    input.paidAssessmentYearIds instanceof Set
      ? input.paidAssessmentYearIds
      : new Set(input.paidAssessmentYearIds)

  return paid.has(yearId) ? "NO_DUE" : "DUE"
}

/**
 * When a published demand exists, use outstanding; otherwise any SUCCESS
 * payment for the year counts as paid (legacy Atom full-demand path).
 */
export function isAlreadyPaidForYear(input: {
  assessmentYearId: string
  successPaymentCount: number
  outstanding?: number | null
  hasPublishedDemand?: boolean
}): boolean {
  if (!input.assessmentYearId.trim()) return false
  if (input.hasPublishedDemand) {
    const outstanding = Number(input.outstanding ?? 0)
    return Number.isFinite(outstanding) && outstanding <= 0
  }
  return input.successPaymentCount > 0
}
