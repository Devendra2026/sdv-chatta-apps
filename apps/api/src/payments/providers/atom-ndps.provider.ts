import { createHash } from "node:crypto"

import {
  resolveAtomAesPair,
  resolveAtomProduct,
  resolveAtomRefundUrl,
  resolveAtomSubChannel,
} from "../../config/atom-env"
import { isAtomRefundSuccess } from "../payments.safety"
import { atomAesDecrypt, atomAesEncrypt } from "./atom-aes"
import {
  assertAtomCallbackSignatureIfConfigured,
  AtomCallbackParseError,
  atomRefundSignature,
  atomStatusSignature,
} from "./atom-hmac"
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

export { AtomCallbackParseError } from "./atom-hmac"

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

  assertAtomCallbackSignatureIfConfigured(decoded)

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

function kolkataPart(now: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const value = parts.find((part) => part.type === type)?.value ?? "00"
  return value === "24" ? "00" : value
}

/** Atom merchTxnDate: YYYY-MM-DD HH:mm:ss in Asia/Kolkata. */
export function formatAtomMerchTxnDate(now = new Date()): string {
  return `${kolkataPart(now, "year")}-${kolkataPart(now, "month")}-${kolkataPart(now, "day")} ${kolkataPart(now, "hour")}:${kolkataPart(now, "minute")}:${kolkataPart(now, "second")}`
}

/** Atom status merchTxnDate: yyyy-MM-dd in Asia/Kolkata. */
export function formatAtomStatusDate(now = new Date()): string {
  return formatAtomMerchTxnDate(now).slice(0, 10)
}

function wholeRupees(amount: number): number {
  return Math.floor(amount)
}

export type AipayAuthConfig = {
  merchId: string
  password: string
  product: string
  subChannel: string
}

/** AIPay auth body. Amount is a number. custAccNo is omitted (TPV only). */
export function buildAipayAuthPayload(
  input: CreatePaymentInput,
  config: AipayAuthConfig,
  now = new Date()
) {
  const email =
    input.customerEmail?.trim() ||
    (input.customerMobile
      ? `${input.customerMobile}@citizen.chhata.in`
      : "citizen@nagar-panchayat-chhata.in")
  const mobile = input.customerMobile?.trim() || ""
  const subChannel = config.subChannel.trim()

  return {
    payInstrument: {
      headDetails: {
        version: "OTSv1.1",
        api: "AUTH",
        platform: "FLASH",
      },
      merchDetails: {
        merchId: config.merchId,
        userId: "",
        password: config.password,
        merchTxnId: input.merchTxnId,
        merchTxnDate: formatAtomMerchTxnDate(now),
      },
      payDetails: {
        amount: Number(input.amount.toFixed(2)),
        product: config.product,
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
      ...(subChannel ? { payModeSpecificData: { subChannel } } : {}),
    },
  }
}

export function buildAtomStatusPayload(input: {
  merchId: string
  merchTxnId: string
  amount: number
  merchTxnDate: string
  reqHashKey: string
}) {
  const amount = wholeRupees(input.amount)
  return {
    payInstrument: {
      payDetails: {
        amount,
        signature: atomStatusSignature({
          merchId: input.merchId,
          merchTxnId: input.merchTxnId,
          amount,
          reqHashKey: input.reqHashKey,
        }),
        txnCurrency: "INR",
      },
      merchDetails: {
        merchId: input.merchId,
        merchTxnId: input.merchTxnId,
        merchTxnDate: input.merchTxnDate,
      },
    },
  }
}

export function buildAtomRefundPayload(input: {
  merchId: string
  password: string
  merchTxnId: string
  atomTxnId: string
  amount: number
  product: string
  reqHashKey: string
  prodRefundId: string
}) {
  const totalRefundAmount = wholeRupees(input.amount)
  return {
    payInstrument: {
      headDetails: { api: "REFUNDINIT", source: "OTS" },
      merchDetails: {
        merchId: input.merchId,
        password: input.password,
        merchTxnId: input.merchTxnId,
      },
      payDetails: {
        atomTxnId: input.atomTxnId,
        signature: atomRefundSignature({
          merchId: input.merchId,
          password: input.password,
          merchTxnId: input.merchTxnId,
          totalRefundAmount,
          reqHashKey: input.reqHashKey,
        }),
        prodDetails: [
          {
            prodName: input.product,
            prodRefundId: input.prodRefundId,
            prodRefundAmount: totalRefundAmount,
          },
        ],
        txnCurrency: "INR",
        totalRefundAmount,
      },
    },
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
  private reqAes = resolveAtomAesPair(
    process.env.ATOM_AES_REQUEST_KEY,
    process.env.ATOM_AES_REQUEST_IV
  )
  private resAes = resolveAtomAesPair(
    process.env.ATOM_AES_RESPONSE_KEY,
    process.env.ATOM_AES_RESPONSE_IV
  )
  private product = resolveAtomProduct(process.env)
  private subChannel = resolveAtomSubChannel(process.env)

  private encryptRequest(plain: string) {
    return atomAesEncrypt(plain, this.reqAes.key, this.reqAes.salt)
  }

  private decryptResponse(encHex: string) {
    return atomAesDecrypt(encHex, this.resAes.key, this.resAes.salt)
  }

  /**
   * Auth, status, and refund share the kit body: merchId + encData.
   * A Bearer token is sent only when ATOM_API_SECRET_KEY is set. This
   * protocol does not use that secret; the password and hash keys do.
   */
  private async postEncrypted(url: string, encData: string): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    }
    const apiSecret = process.env.ATOM_API_SECRET_KEY?.trim()
    if (apiSecret) {
      headers.Authorization = `Bearer ${Buffer.from(`${this.merchId}:${apiSecret}`).toString("base64")}`
    }
    return fetch(url, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        encData,
        merchId: this.merchId,
      }).toString(),
    })
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

  authRequestBody(input: CreatePaymentInput, now = new Date()) {
    return buildAipayAuthPayload(
      input,
      {
        merchId: this.merchId,
        password: this.password,
        product: this.product,
        subChannel: this.subChannel,
      },
      now
    )
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const body = this.authRequestBody(input)
    const encData = this.encryptRequest(JSON.stringify(body))

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

  private reqHashKey(): string {
    const key = process.env.ATOM_REQ_HASH_KEY?.trim() ?? ""
    if (!key) {
      throw new AtomCallbackParseError(
        "MISSING_REQ_HASH_KEY",
        "ATOM_REQ_HASH_KEY is required to sign Atom status and refund requests"
      )
    }
    return key
  }

  private refundEndpoint(): string {
    return resolveAtomRefundUrl(process.env, this.baseUrl)
  }

  async requery(input: RequeryInput): Promise<RequeryResult> {
    const payload = buildAtomStatusPayload({
      merchId: this.merchId,
      merchTxnId: input.merchTxnId,
      amount: input.amount,
      merchTxnDate: formatAtomStatusDate(input.merchTxnAt),
      reqHashKey: this.reqHashKey(),
    })
    const encData = this.encryptRequest(JSON.stringify(payload))
    const response = await this.postEncrypted(
      `${this.baseUrl.replace(/\/$/, "")}/ots/v2/payment/status`,
      encData
    )
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
    const payload = buildAtomRefundPayload({
      merchId: this.merchId,
      password: this.password,
      merchTxnId: input.merchTxnId,
      atomTxnId: input.atomTxnId,
      amount: input.amount,
      product: this.product,
      reqHashKey: this.reqHashKey(),
      prodRefundId: `RF-${input.merchTxnId}`.slice(0, 30),
    })
    const encData = this.encryptRequest(JSON.stringify(payload))
    const endpoint = this.refundEndpoint()
    const response = await this.postEncrypted(endpoint, encData)
    const rawText = await response.text()
    const raw: unknown = tryParseJson(rawText) ?? rawText
    const decoded = this.decodeMaybeEncrypted(raw)
    const fields = extractAtomTxnFields(decoded)
    const success = isAtomRefundSuccess(response.ok, fields.statusCode)

    return {
      statusCode: fields.statusCode,
      success,
      gatewayRefundId:
        fields.atomTxnId ??
        createHash("sha1").update(input.merchTxnId).digest("hex").slice(0, 16),
      raw: decoded,
    }
  }
}
