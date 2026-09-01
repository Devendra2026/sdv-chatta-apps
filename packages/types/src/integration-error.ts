export type IntegrationErrorShape = {
  code: string
  message: string
  status: number
}

export function formatIntegrationError(
  error: IntegrationErrorShape,
  fallback = "Request failed"
): string {
  if (!error.message?.trim()) return fallback
  return `${error.message} (${error.status}: ${error.code})`
}
