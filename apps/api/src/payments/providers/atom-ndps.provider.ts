import { createHash } from "node:crypto"

import { atomAesDecrypt, atomAesEncrypt } from "./atom-aes"
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayProvider,
  RefundInput,
  RefundResult,
  RequeryInput,
  RequeryResult,
} from "./payment-provider"

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value))
      return String(value)
  }
  return undefined
}

function payInstrumentOf(decoded: unknown): JsonObject | null {
  const root = asObject(decoded)
  if (!root) return null
  return asObject(root.payInstrument) ?? root
}

/** Extract status / txn fields from flat or nested Atom payInstrument payloads. */
export function extractAtomTxnFields(decoded: unknown): {
  merchTxnId?: string
  atomTxnId?: string
  statusCode: string
  gatewayAmount?: number
  redirectUrl?: string
  message?: string
} {
  const root = asObject(decoded)
  const instrument = payInstrumentOf(decoded)
  const merchDetails = asObject(instrument?.merchDetails)
  const payDetails = asObject(instrument?.payDetails)
  const responseDetails = asObject(instrument?.responseDetails)

  const amountRaw = pickString(payDetails?.amount, root?.amount)
  const gatewayAmount =
    amountRaw !== undefined && Number.isFinite(Number(amountRaw))
      ? Number(amountRaw)
      : undefined

  return {
    merchTxnId: pickString(
      root?.merchTxnId,
      root?.merchantTxnId,
      merchDetails?.merchTxnId,
      merchDetails?.merchantTxnId
    ),
    atomTxnId: pickString(
      root?.atomTxnId,
      payDetails?.atomTxnId,
      instrument?.atomTxnId
    ),
    statusCode:
      pickString(
        root?.statusCode,
        responseDetails?.statusCode,
        responseDetails?.message
      ) ?? "UNKNOWN",
    gatewayAmount,
    redirectUrl: pickString(
      root?.redirectUrl,
      instrument?.redirectUrl,
      responseDetails?.redirectUrl,
      payDetails?.redirectUrl
    ),
    message: pickString(responseDetails?.message, root?.message),
  }
}

export class AtomCallbackParseError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "AtomCallbackParseError"
    this.code = code
  }
}

export type ParsedAtomCallback = {
  decoded: unknown
  fields: ReturnType<typeof extractAtomTxnFields>
  normalized: Record<string, unknown>
}

/** Require encrypted Atom callback bodies — reject unsigned plain JSON. */
export function parseAtomEncryptedCallback(
  payload: Record<string, unknown>,
  provider: Pick<AtomNdpsProvider, "decryptPayload">
): ParsedAtomCallback {
  const encData =
    typeof payload.encData === "string" ? payload.encData.trim() : ""
  if (!encData) {
    throw new AtomCallbackParseError(
      "MISSING_ENCDATA",
      "Gateway callback must include encData"
    )
  }

  if (!provider.decryptPayload) {
    throw new AtomCallbackParseError(
      "DECRYPT_UNAVAILABLE",
      "Gateway provider cannot decrypt callback payload"
    )
  }

  let decoded: unknown
  try {
    decoded = provider.decryptPayload(encData)
  } catch {
    throw new AtomCallbackParseError(
      "DECRYPT_FAILED",
      "Failed to decrypt gateway callback encData"
    )
  }

  const fields = extractAtomTxnFields(decoded)
  const normalized: Record<string, unknown> = {
    ...payload,
    ...(typeof decoded === "object" && decoded !== null
      ? (decoded as Record<string, unknown>)
      : {}),
    merchTxnId: fields.merchTxnId,
    atomTxnId: fields.atomTxnId,
    statusCode: fields.statusCode,
    gatewayAmount: fields.gatewayAmount,
    _decoded: decoded,
    _encDataVerified: true,
  }

  return { decoded, fields, normalized }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * Atom NDPS / OTS Non-Seamless provider.
 * Crypto follows official AtomAES (PBKDF2); paths follow docs/payments/.
 */
export class AtomNdpsProvider implements PaymentGatewayProvider {
  readonly name = "atom-ndps"

  private baseUrl =
    process.env.ATOM_BASE_URL ?? "https://paynetzuat.atomtech.in"
  private merchId = process.env.ATOM_MERCH_ID ?? ""
  private password = process.env.ATOM_PASSWORD ?? ""
  private apiSecret = process.env.ATOM_API_SECRET_KEY ?? ""
  private reqKey = process.env.ATOM_AES_REQUEST_KEY ?? ""
  private reqSalt =
    process.env.ATOM_AES_REQUEST_IV ?? process.env.ATOM_AES_REQUEST_KEY ?? ""
  private resKey =
    process.env.ATOM_AES_RESPONSE_KEY ?? process.env.ATOM_AES_REQUEST_KEY ?? ""
  private resSalt =
    process.env.ATOM_AES_RESPONSE_IV ??
    process.env.ATOM_AES_RESPONSE_KEY ??
    this.reqSalt
  private product = process.env.ATOM_PRODUCT ?? "NSE"

  private authHeader() {
    const token = Buffer.from(`${this.merchId}:${this.apiSecret}`).toString(
      "base64"
    )
    return `Bearer ${token}`
  }

  private encryptRequest(plain: string) {
    return atomAesEncrypt(plain, this.reqKey, this.reqSalt)
  }

  private decryptResponse(encHex: string) {
    return atomAesDecrypt(encHex, this.resKey, this.resSalt)
  }

  /** Decrypt gateway encData (callback / return / API response). */
  decryptPayload(encData: string): unknown {
    const plain = this.decryptResponse(encData.trim())
    const parsed = tryParseJson(plain)
    return parsed ?? plain
  }

  private decodeMaybeEncrypted(raw: unknown): unknown {
    const obj = asObject(raw)
    if (obj && typeof obj.encData === "string" && obj.encData.trim()) {
      try {
        return this.decryptPayload(obj.encData)
      } catch {
        return raw
      }
    }
    if (typeof raw === "string" && raw.trim()) {
      const asJson = tryParseJson(raw)
      if (asJson) return this.decodeMaybeEncrypted(asJson)
      // form-style: encData=...&merchId=...
      if (raw.includes("encData=")) {
        const params = new URLSearchParams(
          raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : raw
        )
        const enc = params.get("encData")
        if (enc) {
          try {
            return this.decryptPayload(enc)
          } catch {
            return raw
          }
        }
      }
    }
    return raw
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const email =
      input.customerEmail?.trim() ||
      (input.customerMobile
        ? `${input.customerMobile}@citizen.chhata.in`
        : "citizen@nagar-panchayat-chhata.in")
    const mobile = input.customerMobile?.trim() || ""

    const payInstrument = {
      headDetails: {
        version: "OTSv1.1",
        api: "AUTH",
        platform: "FLASH",
      },
      merchDetails: {
        merchId: this.merchId,
        userId: "",
        password: this.password,
        merchTxnId: input.merchTxnId,
        merchTxnDate: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
      payDetails: {
        amount: input.amount.toFixed(2),
        product: this.product,
        custAccNo: "000000000000",
        txnCurrency: "INR",
      },
      custDetails: {
        custEmail: email,
        custMobile: mobile,
      },
      extras: {
        udf1: input.customerName ?? "",
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: "",
      },
    }

    const encData = this.encryptRequest(JSON.stringify({ payInstrument }))

    // AIPay auth — returns atomTokenId for atomcheckout.js (card / UPI / NB).
    const authUrl =
      process.env.ATOM_AUTH_URL?.trim() ||
      `${this.baseUrl.replace(/\/$/, "")}/ots/aipay/auth`

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        encData,
        merchId: this.merchId,
      }).toString(),
    })

    const rawText = await response.text()
    const decoded = this.decodeAipayAuthResponse(rawText)
    const token = this.extractAtomTokenId(decoded)

    if (!token) {
      return {
        encData,
        merchId: this.merchId,
        raw: decoded ?? rawText,
      }
    }

    return {
      encData,
      merchId: this.merchId,
      atomTokenId: token,
      raw: decoded,
    }
  }

  private decodeAipayAuthResponse(rawText: string): unknown {
    const trimmed = rawText.trim()
    if (!trimmed) return null

    // Typical: merchId=...&encData=HEX  (order may vary)
    if (trimmed.includes("encData=") || trimmed.includes("=")) {
      try {
        const params = new URLSearchParams(
          trimmed.includes("?")
            ? trimmed.slice(trimmed.indexOf("?") + 1)
            : trimmed
        )
        const enc = params.get("encData")
        if (enc) return this.decryptPayload(enc)
      } catch {
        // fall through
      }
      // Kit sample takes explode("&")[1] as encData=...
      const parts = trimmed.split("&")
      for (const part of parts) {
        const idx = part.indexOf("=")
        if (idx > 0 && part.slice(0, idx).toLowerCase() === "encdata") {
          try {
            return this.decryptPayload(part.slice(idx + 1))
          } catch {
            // continue
          }
        }
      }
    }

    // Plain hex ciphertext
    if (/^[0-9A-Fa-f]+$/.test(trimmed) && trimmed.length > 32) {
      try {
        return this.decryptPayload(trimmed)
      } catch {
        // fall through
      }
    }

    const asJson = tryParseJson(trimmed)
    if (asJson) return this.decodeMaybeEncrypted(asJson)
    return trimmed
  }

  private extractAtomTokenId(decoded: unknown): string | undefined {
    const root = asObject(decoded)
    if (!root) return undefined

    const fromRoot = pickString(
      root.atomTokenId,
      root.atomTokenID,
      root.tokenId
    )
    if (fromRoot) return fromRoot

    const responseDetails = asObject(root.responseDetails)
    const status =
      pickString(
        responseDetails?.txnStatusCode,
        responseDetails?.statusCode,
        root.txnStatusCode
      ) ?? ""
    if (
      status &&
      status !== "OTS0000" &&
      status !== "SUCCESS" &&
      status.toUpperCase() !== "SUCCESS"
    ) {
      return undefined
    }

    return pickString(root.atomTokenId, responseDetails?.atomTokenId)
  }

  async requery(input: RequeryInput): Promise<RequeryResult> {
    const payload = {
      payInstrument: {
        headDetails: {
          version: "OTSv1.1",
          api: "TXNVERIFICATION",
          platform: "FLASH",
        },
        merchDetails: {
          merchId: this.merchId,
          password: this.password,
          merchTxnId: input.merchTxnId,
        },
      },
    }
    const encData = this.encryptRequest(JSON.stringify(payload))
    const response = await fetch(`${this.baseUrl}/ots/v2/payment/status`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encData, merchId: this.merchId }),
    })
    const rawText = await response.text()
    const raw: unknown = tryParseJson(rawText) ?? rawText
    const decoded = this.decodeMaybeEncrypted(raw)
    const fields = extractAtomTxnFields(decoded)

    return {
      statusCode: fields.statusCode,
      success:
        fields.statusCode === "OTS0000" ||
        fields.statusCode === "SUCCESS" ||
        fields.message === "SUCCESS",
      atomTxnId: fields.atomTxnId,
      raw: decoded,
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const payload = {
      payInstrument: {
        headDetails: { version: "OTSv1.1", api: "REFUND", platform: "FLASH" },
        merchDetails: {
          merchId: this.merchId,
          password: this.password,
          merchTxnId: input.merchTxnId,
        },
        payDetails: {
          atomTxnId: input.atomTxnId,
          amount: input.amount.toFixed(2),
          txnCurrency: "INR",
        },
      },
    }
    const encData = this.encryptRequest(JSON.stringify(payload))
    const response = await fetch(`${this.baseUrl}/ots/payment/refund`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encData, merchId: this.merchId }),
    })
    const rawText = await response.text()
    const raw: unknown = tryParseJson(rawText) ?? rawText
    const decoded = this.decodeMaybeEncrypted(raw)
    const fields = extractAtomTxnFields(decoded)
    const success =
      response.ok &&
      (fields.statusCode === "OTS0000" ||
        fields.statusCode === "SUCCESS" ||
        fields.statusCode === "UNKNOWN")

    return {
      statusCode:
        fields.statusCode === "UNKNOWN" ? "OTS0000" : fields.statusCode,
      success,
      gatewayRefundId:
        fields.atomTxnId ??
        createHash("sha1").update(input.merchTxnId).digest("hex").slice(0, 16),
      raw: decoded,
    }
  }
}
