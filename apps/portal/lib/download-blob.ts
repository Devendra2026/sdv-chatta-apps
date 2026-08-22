function parseFilenameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim())
  const plain = header.match(/filename="?([^";]+)"?/i)
  return plain?.[1]?.trim()
}

/**
 * Authenticated file download (cookies / same-origin proxy).
 */
export async function downloadAuthenticatedExport(
  path: string,
  fallbackFilename: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : ""

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    credentials: "include",
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const json = (await response.json()) as {
        error?: { message?: string }
        message?: string
      }
      message = json.error?.message ?? json.message ?? message
    } catch {
      // binary or empty body
    }
    throw new Error(message || "Export failed")
  }

  const blob = await response.blob()
  const filename =
    parseFilenameFromDisposition(response.headers.get("Content-Disposition")) ??
    fallbackFilename

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
