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

/** Prefer JSON error text; never treat empty statusText as a message (Node fetch). */
export function describeHttpFailure(opts: {
  status: number
  bodyMessage?: string | null
  statusText?: string | null
  method?: string
  path?: string
  host?: string
}): string {
  const fromBody = opts.bodyMessage?.trim()
  if (fromBody) return fromBody

  const method = opts.method?.trim() || "GET"
  const path = opts.path?.trim()
  const host = opts.host?.trim()
  if (opts.status === 404) {
    const target = path ? `${method} ${path}` : method
    return host ? `Not found: ${target} at ${host}` : `Not found: ${target}`
  }

  return opts.statusText?.trim() || "Request failed"
}
