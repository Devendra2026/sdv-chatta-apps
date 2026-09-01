export type IntegrationErrorShape = {
  code: string
  message: string
  status: number
  path?: string
}

export function formatIntegrationError(
  error: IntegrationErrorShape,
  fallback = "Request failed"
): string {
  const base = error.message?.trim() || fallback
  const formatted = error.message?.trim()
    ? `${base} (${error.status}: ${error.code})`
    : fallback
  if (error.path && !formatted.includes(error.path)) {
    return `${formatted} [${error.path}]`
  }
  return formatted
}

function requestTarget(opts: {
  method?: string
  path?: string
  host?: string
}): string | null {
  const path = opts.path?.trim()
  if (!path) return null
  const method = opts.method?.trim() || "GET"
  const host = opts.host?.trim()
  const target = `${method} ${path}`
  return host ? `${target} at ${host}` : target
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
  const target = requestTarget(opts)
  const fromBody = opts.bodyMessage?.trim()

  let primary: string
  if (fromBody) {
    primary = fromBody
  } else if (opts.status === 404) {
    primary = target ? `Not found: ${target}` : "Not found"
  } else {
    primary = opts.statusText?.trim() || "Request failed"
  }

  const path = opts.path?.trim()
  if (target && path && !primary.includes(path)) {
    return `${primary} [${opts.status} ${target}]`
  }
  return primary
}
