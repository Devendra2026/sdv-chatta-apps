export function toNodeHandler() {
  return (_req: unknown, res: { statusCode: number; end: (b?: string) => void }) => {
    res.statusCode = 200
    res.end("{}")
  }
}

export function fromNodeHeaders(headers: Record<string, unknown>) {
  return headers
}
