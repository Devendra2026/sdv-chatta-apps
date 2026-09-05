import { createHmac, timingSafeEqual } from "node:crypto"

export class AtomCallbackParseError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "AtomCallbackParseError"
    this.code = code
  }
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }
  return undefined
}

function payInstrumentOf(decoded: unknown): JsonObject | null {
  const root = asObject(decoded)
  if (!root) return null
  return asObject(root.payInstrument) ?? root
}

function timingSafeHexEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8")
  const b = Buffer.from(right, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Official Atom callback HMAC:
 * merchId + atomTxnId + merchTxnId + totalAmount.toFixed(2) + statusCode +
 * subChannel[0] + bankTxnId
 */
export function verifyAtomCallbackSignature(
  decoded: unknown,
  respHashKey: string
): boolean {
  const key = respHashKey.trim()
  if (!key) return false

  const instrument = payInstrumentOf(decoded)
  if (!instrument) return false

  const merchDetails = asObject(instrument.merchDetails)
  const payDetails = asObject(instrument.payDetails)
  const responseDetails = asObject(instrument.responseDetails)
  const payMode = asObject(instrument.payModeSpecificData)
  const bankDetails = asObject(payMode?.bankDetails)
  const subChannel = payMode?.subChannel
  const subChannel0 = Array.isArray(subChannel)
    ? pickString(subChannel[0])
    : pickString(subChannel)

  const merchId = pickString(merchDetails?.merchId)
  const atomTxnId = pickString(payDetails?.atomTxnId)
  const merchTxnId = pickString(merchDetails?.merchTxnId)
  const totalAmountRaw = pickString(payDetails?.totalAmount)
  const statusCode = pickString(responseDetails?.statusCode)
  const bankTxnId = pickString(bankDetails?.bankTxnId)
  const received = pickString(payDetails?.signature)

  if (
    !merchId ||
    !atomTxnId ||
    !merchTxnId ||
    totalAmountRaw === undefined ||
    !statusCode ||
    !subChannel0 ||
    !bankTxnId ||
    !received
  ) {
    return false
  }

  const totalAmount = Number(totalAmountRaw)
  if (!Number.isFinite(totalAmount)) return false

  const signatureString = [
    merchId,
    atomTxnId,
    merchTxnId,
    totalAmount.toFixed(2),
    statusCode,
    subChannel0,
    bankTxnId,
  ].join("")

  const calculated = createHmac("sha512", key)
    .update(signatureString)
    .digest("hex")
    .toLowerCase()

  return timingSafeHexEqual(calculated, received.toLowerCase())
}

export function assertAtomCallbackSignatureIfConfigured(
  decoded: unknown
): void {
  const key = process.env.ATOM_RESP_HASH_KEY?.trim()
  if (!key) return
  if (!verifyAtomCallbackSignature(decoded, key)) {
    throw new AtomCallbackParseError(
      "INVALID_SIGNATURE",
      "Invalid gateway callback signature"
    )
  }
}
