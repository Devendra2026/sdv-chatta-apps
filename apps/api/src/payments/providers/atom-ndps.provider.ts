import { createCipheriv, createDecipheriv, createHash } from "node:crypto"

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayProvider,
  RefundInput,
  RefundResult,
  RequeryInput,
  RequeryResult,
} from "./payment-provider"

function aesEncrypt(plain: string, key: string, iv: string) {
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv))
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("hex")
}

function aesDecrypt(encHex: string, key: string, iv: string) {
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv))
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]).toString("utf8")
}

/**
 * Atom NDPS / OTS Non-Seamless provider.
 * Paths and crypto follow docs under docs/payments/.
 */
export class AtomNdpsProvider implements PaymentGatewayProvider {
  readonly name = "atom-ndps"

  private baseUrl = process.env.ATOM_BASE_URL ?? "https://paynetzuat.atomtech.in"
  private merchId = process.env.ATOM_MERCH_ID ?? ""
  private password = process.env.ATOM_PASSWORD ?? ""
  private apiSecret = process.env.ATOM_API_SECRET_KEY ?? ""
  private reqKey = process.env.ATOM_AES_REQUEST_KEY ?? ""
  private reqIv = process.env.ATOM_AES_REQUEST_IV ?? ""
  private resKey = process.env.ATOM_AES_RESPONSE_KEY ?? this.reqKey
  private resIv = process.env.ATOM_AES_RESPONSE_IV ?? this.reqIv
  private product = process.env.ATOM_PRODUCT ?? "NSE"

  private authHeader() {
    const token = Buffer.from(`${this.merchId}:${this.apiSecret}`).toString("base64")
    return `Bearer ${token}`
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
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
        custAccNo: "",
        txnCurrency: "INR",
      },
      custDetails: {
        custEmail: input.customerEmail ?? "",
        custMobile: input.customerMobile ?? "",
      },
      extras: {
        udf1: input.customerName ?? "",
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: "",
      },
    }

    const encData = aesEncrypt(JSON.stringify({ payInstrument }), this.reqKey, this.reqIv)
    const response = await fetch(`${this.baseUrl}/ots/v1/payment/init`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encData,
        merchId: this.merchId,
        returnUrl: input.returnUrl,
        callbackUrl: input.callbackUrl,
      }),
    })

    const raw = await response.json().catch(() => ({}))
    return {
      encData,
      merchId: this.merchId,
      redirectUrl:
        typeof raw === "object" && raw && "redirectUrl" in raw
          ? String((raw as { redirectUrl: string }).redirectUrl)
          : undefined,
      raw,
    }
  }

  async requery(input: RequeryInput): Promise<RequeryResult> {
    const payload = {
      payInstrument: {
        headDetails: { version: "OTSv1.1", api: "TXNVERIFICATION", platform: "FLASH" },
        merchDetails: {
          merchId: this.merchId,
          password: this.password,
          merchTxnId: input.merchTxnId,
        },
      },
    }
    const encData = aesEncrypt(JSON.stringify(payload), this.reqKey, this.reqIv)
    const response = await fetch(`${this.baseUrl}/ots/v2/payment/status`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encData, merchId: this.merchId }),
    })
    const raw = await response.json().catch(() => ({}))
    let decoded: unknown = raw
    if (
      typeof raw === "object" &&
      raw &&
      "encData" in raw &&
      typeof (raw as { encData: string }).encData === "string"
    ) {
      try {
        decoded = JSON.parse(
          aesDecrypt((raw as { encData: string }).encData, this.resKey, this.resIv)
        )
      } catch {
        decoded = raw
      }
    }

    const statusCode =
      typeof decoded === "object" &&
      decoded &&
      "payInstrument" in decoded &&
      typeof (decoded as { payInstrument?: { responseDetails?: { statusCode?: string } } })
        .payInstrument?.responseDetails?.statusCode === "string"
        ? (decoded as { payInstrument: { responseDetails: { statusCode: string } } })
            .payInstrument.responseDetails.statusCode
        : "UNKNOWN"

    return {
      statusCode,
      success: statusCode === "OTS0000",
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
    const encData = aesEncrypt(JSON.stringify(payload), this.reqKey, this.reqIv)
    const response = await fetch(`${this.baseUrl}/ots/payment/refund`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encData, merchId: this.merchId }),
    })
    const raw = await response.json().catch(() => ({}))
    return {
      statusCode: "OTS0000",
      success: response.ok,
      gatewayRefundId: createHash("sha1").update(input.merchTxnId).digest("hex").slice(0, 16),
      raw,
    }
  }

  decryptCallback(encData: string): unknown {
    return JSON.parse(aesDecrypt(encData, this.resKey, this.resIv))
  }
}
