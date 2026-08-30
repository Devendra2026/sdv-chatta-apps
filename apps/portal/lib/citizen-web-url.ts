/** Public citizen website base URL (apps/web). Used for staff links to online pay. */
export function getCitizenWebUrl(): string {
  const configured = process.env.NEXT_PUBLIC_CITIZEN_WEB_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  return "http://localhost:3001"
}

export function citizenPropertyTaxUrl(surveyId?: string): string {
  const base = getCitizenWebUrl()
  if (surveyId) {
    return `${base}/propertytax/dues/${encodeURIComponent(surveyId)}`
  }
  return `${base}/propertytax`
}
