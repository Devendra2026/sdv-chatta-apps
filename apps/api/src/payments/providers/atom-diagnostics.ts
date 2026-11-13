/**
 * Sanitized Atom gateway diagnostics for ops / NTT DATA support.
 * Never include passwords, AES/HMAC keys, tokens, encData, OTP, or full PII.
 */

export type AtomAuthFieldDiag = {
  present: boolean
  type: string
  valid: boolean
  note?: string
}

export type AtomAuthRequestDiagnostic = {
  structure: "payInstrument"
  headDetails: {
    version: AtomAuthFieldDiag
    api: AtomAuthFieldDiag
    platform: AtomAuthFieldDiag
  }
  merchDetails: {
    merchId: AtomAuthFieldDiag
    userId: AtomAuthFieldDiag
    password: AtomAuthFieldDiag
    merchTxnId: AtomAuthFieldDiag
    merchTxnDate: AtomAuthFieldDiag
  }
  payDetails: {
    amount: AtomAuthFieldDiag
    product: AtomAuthFieldDiag
    custAccNo: AtomAuthFieldDiag
    txnCurrency: AtomAuthFieldDiag
  }
  custDetails: {
    custEmail: AtomAuthFieldDiag
    custMobile: AtomAuthFieldDiag
  }
  extras: {
    udf1: AtomAuthFieldDiag
    udf2: AtomAuthFieldDiag
    udf3: AtomAuthFieldDiag
    udf4: AtomAuthFieldDiag
    udf5: AtomAuthFieldDiag
  }
  payModeSpecificData: {
    present: boolean
    subChannel?: string
  }
  validationOk: boolean
}

export type AtomGatewayDiagnosticEvent = {
  event: string
  merchTxnId?: string
  atomTxnId?: string
  merchId?: string
  timestamp: string
  amount?: number | string
  currency?: string
  paymentMode?: string
  endpoint?: string
  httpStatus?: number
  gatewayStatusCode?: string
  gatewayMessage?: string
  tokenGenerated?: boolean
  paymentStatus?: string
  correlationId?: string
  durationMs?: number
  failureReason?: string
  authDiagnostic?: AtomAuthRequestDiagnostic
}

function fieldType(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

function diagField(
  value: unknown,
  valid: boolean,
  note?: string
): AtomAuthFieldDiag {
  return {
    present: value !== undefined && value !== null,
    type: fieldType(value),
    valid,
    ...(note ? { note } : {}),
  }
}

export function maskEmail(email: string): string {
  const trimmed = email.trim()
  const at = trimmed.indexOf("@")
  if (at <= 0) return "***"
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  const localMask =
    local.length <= 2 ? `${local[0] ?? "*"}*` : `${local[0]}***${local.at(-1)}`
  return `${localMask}@${domain}`
}

export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "")
  if (digits.length < 4) return "****"
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

/**
 * Build a safe AUTH request diagnostic from a validated (or candidate) payload.
 * Values for secrets and PII are never included — only presence/types/validity.
 */
export function buildAuthRequestDiagnostic(
  payload: unknown,
  validationOk: boolean
): AtomAuthRequestDiagnostic {
  const root =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {}
  const instrument =
    typeof root.payInstrument === "object" && root.payInstrument !== null
      ? (root.payInstrument as Record<string, unknown>)
      : {}
  const head =
    typeof instrument.headDetails === "object" &&
    instrument.headDetails !== null
      ? (instrument.headDetails as Record<string, unknown>)
      : {}
  const merch =
    typeof instrument.merchDetails === "object" &&
    instrument.merchDetails !== null
      ? (instrument.merchDetails as Record<string, unknown>)
      : {}
  const pay =
    typeof instrument.payDetails === "object" && instrument.payDetails !== null
      ? (instrument.payDetails as Record<string, unknown>)
      : {}
  const cust =
    typeof instrument.custDetails === "object" &&
    instrument.custDetails !== null
      ? (instrument.custDetails as Record<string, unknown>)
      : {}
  const extras =
    typeof instrument.extras === "object" && instrument.extras !== null
      ? (instrument.extras as Record<string, unknown>)
      : {}
  const mode =
    typeof instrument.payModeSpecificData === "object" &&
    instrument.payModeSpecificData !== null
      ? (instrument.payModeSpecificData as Record<string, unknown>)
      : null

  const amountStr =
    typeof pay.amount === "string" || typeof pay.amount === "number"
      ? String(pay.amount)
      : ""
  const mobile =
    typeof cust.custMobile === "string" ? cust.custMobile.trim() : ""
  const email = typeof cust.custEmail === "string" ? cust.custEmail.trim() : ""

  return {
    structure: "payInstrument",
    headDetails: {
      version: diagField(head.version, head.version === "OTSv1.1"),
      api: diagField(head.api, head.api === "AUTH"),
      platform: diagField(head.platform, head.platform === "FLASH"),
    },
    merchDetails: {
      merchId: diagField(
        merch.merchId,
        typeof merch.merchId === "string" && merch.merchId.trim().length > 0
      ),
      userId: diagField(merch.userId, merch.userId === ""),
      password: diagField(
        merch.password !== undefined ? "[redacted]" : undefined,
        typeof merch.password === "string" && merch.password.length > 0,
        "value redacted"
      ),
      merchTxnId: diagField(
        merch.merchTxnId,
        typeof merch.merchTxnId === "string" && merch.merchTxnId.trim().length > 0
      ),
      merchTxnDate: diagField(
        merch.merchTxnDate,
        typeof merch.merchTxnDate === "string" &&
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(merch.merchTxnDate)
      ),
    },
    payDetails: {
      amount: diagField(
        pay.amount,
        typeof pay.amount === "string" && /^\d+\.\d{2}$/.test(amountStr)
      ),
      product: diagField(
        pay.product,
        typeof pay.product === "string" && pay.product.trim().length > 0
      ),
      custAccNo: diagField(
        pay.custAccNo,
        typeof pay.custAccNo === "string" && pay.custAccNo.trim().length > 0,
        "value omitted"
      ),
      txnCurrency: diagField(pay.txnCurrency, pay.txnCurrency === "INR"),
    },
    custDetails: {
      custEmail: diagField(
        email ? maskEmail(email) : undefined,
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ),
      custMobile: diagField(
        mobile ? maskMobile(mobile) : undefined,
        /^\d{10}$/.test(mobile)
      ),
    },
    extras: {
      udf1: diagField(extras.udf1, extras.udf1 === ""),
      udf2: diagField(extras.udf2, extras.udf2 === ""),
      udf3: diagField(extras.udf3, extras.udf3 === ""),
      udf4: diagField(extras.udf4, extras.udf4 === ""),
      udf5: diagField(extras.udf5, extras.udf5 === ""),
    },
    payModeSpecificData: {
      present: mode !== null,
      ...(mode && typeof mode.subChannel === "string"
        ? { subChannel: mode.subChannel }
        : {}),
    },
    validationOk,
  }
}

export function buildGatewayDiagnosticEvent(
  partial: Omit<AtomGatewayDiagnosticEvent, "timestamp"> & {
    timestamp?: string
  }
): AtomGatewayDiagnosticEvent {
  return {
    timestamp: partial.timestamp ?? new Date().toISOString(),
    ...partial,
  }
}
