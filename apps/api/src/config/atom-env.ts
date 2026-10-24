/**
 * Atom AIPay settings shared by startup validation and the payment provider.
 * Credential roles are not interchangeable:
 * - ATOM_PASSWORD is the transaction password inside the encrypted payload.
 * - ATOM_REQ_HASH_KEY / ATOM_RESP_HASH_KEY are HMAC passphrases.
 * - ATOM_AES_*_IV is the 32-hex merchant encryption string. The AES-CBC IV is
 *   the fixed bytes 0..15 in atom-aes.ts. NTT's kit uses this string as both
 *   the PBKDF2 password and the PBKDF2 salt (self-salt).
 * - ATOM_AES_*_KEY is optional and used only when NTT issued a different key.
 */

export const PROD_ATOM_REFUND_URL =
  "https://payment.atomtech.in/ots/payment/refund"

export const PROD_ATOM_SUB_CHANNEL = "UP"

const AES_HEX_32 = /^[0-9A-Fa-f]{32}$/

export type AtomAesMode = "distinct" | "self-salt" | "missing"

export type AtomAesPair = {
  key: string
  salt: string
  mode: AtomAesMode
}

export function isAtomPaymentProvider(env: NodeJS.ProcessEnv): boolean {
  return env.PAYMENT_PROVIDER?.trim().toLowerCase() === "atom"
}

/**
 * Official AtomAES sample uses the same 32-hex string for PBKDF2 password and
 * salt. A distinct ATOM_AES_*_KEY is applied only when it is actually set.
 */
export function resolveAtomAesPair(
  key: string | undefined,
  salt: string | undefined
): AtomAesPair {
  const trimmedKey = key?.trim() ?? ""
  const trimmedSalt = salt?.trim() ?? ""
  if (trimmedKey && trimmedSalt) {
    return {
      key: trimmedKey,
      salt: trimmedSalt,
      mode: trimmedKey === trimmedSalt ? "self-salt" : "distinct",
    }
  }
  if (trimmedSalt) {
    return { key: trimmedSalt, salt: trimmedSalt, mode: "self-salt" }
  }
  if (trimmedKey) {
    return { key: trimmedKey, salt: trimmedKey, mode: "self-salt" }
  }
  return { key: "", salt: "", mode: "missing" }
}

export function atomAesMaterialErrors(
  keyName: string,
  ivName: string,
  key: string | undefined,
  iv: string | undefined
): { errors: string[]; mode: AtomAesMode } {
  const rawKey = key?.trim() ?? ""
  const rawIv = iv?.trim() ?? ""
  const pair = resolveAtomAesPair(rawKey, rawIv)
  if (pair.mode === "missing") {
    return {
      errors: [
        `${ivName} is required in production when using Atom AIPay (32 hexadecimal characters; this value is the PBKDF2 key and salt, not the AES CBC IV)`,
      ],
      mode: pair.mode,
    }
  }
  const errors: string[] = []
  if (rawIv && !AES_HEX_32.test(rawIv)) {
    errors.push(`${ivName} must be 32 hexadecimal characters`)
  }
  if (rawKey && !AES_HEX_32.test(rawKey)) {
    errors.push(`${keyName} must be 32 hexadecimal characters`)
  }
  return { errors, mode: pair.mode }
}

/**
 * payDetails.product / refund prodName.
 * ProductID is the live settlement product. It wins when both are set so the
 * kit sample ATOM_PRODUCT=NSE does not override ProductID=NAGAR.
 */
export function resolveAtomProduct(env: NodeJS.ProcessEnv): string {
  return env.ProductID?.trim() || env.ATOM_PRODUCT?.trim() || ""
}

/** UPI-only checkout in production. An explicit value is never overwritten. */
export function resolveAtomSubChannel(env: NodeJS.ProcessEnv): string {
  const configured = env.ATOM_SUB_CHANNEL?.trim() ?? ""
  if (configured) return configured
  if (env.NODE_ENV === "production" && isAtomPaymentProvider(env)) {
    return PROD_ATOM_SUB_CHANNEL
  }
  return ""
}

/**
 * Production refunds use payment.atomtech.in, not the auth host.
 * An explicit URL is kept so a wrong host still fails validation.
 */
export function resolveAtomRefundUrl(
  env: NodeJS.ProcessEnv,
  baseUrl: string
): string {
  const configured = env.ATOM_REFUND_URL?.trim().replace(/\/+$/, "") ?? ""
  if (configured) return configured
  if (env.NODE_ENV === "production" && isAtomPaymentProvider(env)) {
    return PROD_ATOM_REFUND_URL
  }
  const base = baseUrl.trim().replace(/\/+$/, "")
  return base ? `${base}/ots/payment/refund` : ""
}
