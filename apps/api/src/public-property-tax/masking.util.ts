/** Mask owner display name for public citizen search results. */
export function maskOwnerName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim()
  if (!trimmed) return "—"

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"

  const first = parts[0] ?? ""
  const firstChar = [...first][0] ?? "*"
  if (parts.length === 1) {
    if ([...first].length <= 1) return `${firstChar}****`
    return `${firstChar}****`
  }

  const rest = parts.slice(1).join(" ")
  return `${firstChar}**** ${rest}`
}

/** Mask mobile as 98****3210 (first 2 + **** + last 4). */
export function maskMobile(mobile: string | null | undefined): string {
  const digits = (mobile ?? "").replace(/\D/g, "")
  if (digits.length < 6) return "—****—"
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}****${digits.slice(-4)}`
  }
  const head = digits.slice(0, Math.min(2, digits.length))
  const tail = digits.slice(-Math.min(4, Math.max(0, digits.length - 2)))
  return `${head}****${tail}`
}

export function normalizeMobileDigits(mobile: string): string {
  return mobile.replace(/\D/g, "")
}

export function assertOwnerSearchInput(
  ownerName: string,
  mobile: string
): string | null {
  const name = ownerName.trim()
  const digits = normalizeMobileDigits(mobile)
  if (name.length < 3) {
    return "Owner name must be at least 3 characters"
  }
  if (digits.length !== 10) {
    return "Mobile number must be exactly 10 digits"
  }
  return null
}
