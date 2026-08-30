export function toNodeHandler() {
  return (
    req: { url?: string; baseUrl?: string; originalUrl?: string },
    res: {
      statusCode: number
      setHeader?: (name: string, value: string) => void
      end: (b?: string) => void
    }
  ) => {
    res.statusCode = 200
    res.setHeader?.("content-type", "application/json")
    res.end(
      JSON.stringify({
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
      })
    )
  }
}

export function fromNodeHeaders(headers: Record<string, unknown>) {
  return headers
}
