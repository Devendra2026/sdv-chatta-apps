/**
 * Staff property-tax receipt download / print helpers.
 * PDF bytes come from GET /api/v1/payments/:id/receipt.pdf (office + consumer
 * copies on one A4 page). Reprint does not create a new payment.
 */

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim())
    } catch {
      return utf[1].trim()
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return plain?.[1]?.trim() || null
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Download the authoritative staff receipt PDF for a payment.
 * Returns false if the request failed before a blob was obtained.
 */
export async function downloadStaffReceiptPdf(
  paymentId: string,
  fetchBlob: (path: string) => Promise<{ blob: Blob; filename: string | null }>
): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  try {
    const { blob, filename } = await fetchBlob(
      `/api/v1/payments/${encodeURIComponent(paymentId)}/receipt.pdf`
    )
    const name =
      filename || `Property-Tax-Receipt-${paymentId.slice(0, 12)}.pdf`
    triggerDownload(blob, name)
    return { ok: true, filename: name }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to download receipt",
    }
  }
}

/**
 * Open the staff receipt PDF in a new tab and invoke the browser print dialog
 * so paper output matches the downloaded file.
 */
export async function printStaffReceiptPdf(
  paymentId: string,
  fetchBlob: (path: string) => Promise<{ blob: Blob; filename: string | null }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { blob } = await fetchBlob(
      `/api/v1/payments/${encodeURIComponent(paymentId)}/receipt.pdf`
    )
    const url = URL.createObjectURL(blob)
    const w = window.open(url, "_blank")
    if (!w) {
      URL.revokeObjectURL(url)
      return {
        ok: false,
        error: "Popup blocked. Please allow popups for this site.",
      }
    }
    const revoke = () => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
    }
    w.addEventListener("load", () => {
      try {
        w.focus()
        w.print()
      } catch {
        // Some browsers block print until the user interacts.
      }
      window.setTimeout(revoke, 60_000)
    })
    // Fallback if load already fired (blob URLs vary by browser).
    window.setTimeout(() => {
      try {
        if (!w.closed) {
          w.focus()
          w.print()
        }
      } catch {
        // ignore
      }
    }, 750)
    window.setTimeout(revoke, 120_000)
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to print receipt",
    }
  }
}

export { parseFilename }
