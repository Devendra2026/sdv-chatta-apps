import { atomAesDecrypt, atomAesEncrypt } from "./atom-aes"
import {
  AtomNdpsProvider,
  buildAipayAuthPayload,
  buildAtomRefundPayload,
  buildAtomStatusPayload,
  formatAtomMerchTxnDate,
} from "./atom-ndps.provider"

const NOW = new Date("2024-01-15T19:00:00.000Z")

const paymentInput = {
  merchTxnId: "CHH-1",
  amount: 1500.5,
  customerName: "Owner",
  customerEmail: "payer@example.com",
  customerMobile: "9876543210",
  returnUrl: "https://www.example.com/api/v1/payments/gateway/return",
  callbackUrl: "https://www.example.com/api/v1/payments/gateway/callback",
}

describe("formatAtomMerchTxnDate", () => {
  it("formats Asia/Kolkata clock time", () => {
    expect(formatAtomMerchTxnDate(NOW)).toBe("2024-01-16 00:30:00")
  })
})

describe("buildAipayAuthPayload", () => {
  it("sends product NAGAR, UPI subchannel UP, and a numeric amount", () => {
    const body = buildAipayAuthPayload(
      paymentInput,
      {
        merchId: "317157",
        password: "txn-pass",
        product: "NAGAR",
        subChannel: "UP",
      },
      NOW
    )
    const pay = body.payInstrument.payDetails
    expect(pay.amount).toBe(1500.5)
    expect(typeof pay.amount).toBe("number")
    expect(pay.product).toBe("NAGAR")
    expect(pay).not.toHaveProperty("custAccNo")
    expect(body.payInstrument.payModeSpecificData).toEqual({ subChannel: "UP" })
    expect(body.payInstrument.merchDetails.merchTxnDate).toBe(
      "2024-01-16 00:30:00"
    )
  })
})

describe("AtomNdpsProvider auth config", () => {
  const keys = [
    "ATOM_MERCH_ID",
    "ATOM_PASSWORD",
    "ATOM_PRODUCT",
    "ATOM_SUB_CHANNEL",
    "ATOM_AES_REQUEST_KEY",
    "ATOM_AES_REQUEST_IV",
    "ATOM_AES_RESPONSE_KEY",
    "ATOM_AES_RESPONSE_IV",
    "ATOM_API_SECRET_KEY",
    "ATOM_REFUND_URL",
    "ATOM_REQ_HASH_KEY",
    "ProductID",
    "PAYMENT_PROVIDER",
    "NODE_ENV",
    "ATOM_AUTH_URL",
  ] as const
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of keys) saved[key] = process.env[key]
    process.env.ATOM_MERCH_ID = "317157"
    process.env.ATOM_PASSWORD = "txn-pass"
    process.env.ATOM_PRODUCT = "NAGAR"
    process.env.ATOM_SUB_CHANNEL = "UP"
    delete process.env.ATOM_AES_REQUEST_KEY
    delete process.env.ATOM_AES_REQUEST_IV
    delete process.env.ATOM_AES_RESPONSE_KEY
    delete process.env.ATOM_AES_RESPONSE_IV
    delete process.env.ATOM_API_SECRET_KEY
    delete process.env.ProductID
  })

  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it("does not default the product to NSE", () => {
    delete process.env.ATOM_PRODUCT
    delete process.env.ProductID
    const provider = new AtomNdpsProvider()
    const body = provider.authRequestBody(paymentInput, NOW)
    expect(body.payInstrument.payDetails.product).toBe("")
  })

  it("sends ProductID when it is set, including when ATOM_PRODUCT is NSE", () => {
    process.env.ATOM_PRODUCT = "NSE"
    process.env.ProductID = "NAGAR"
    const provider = new AtomNdpsProvider()
    const body = provider.authRequestBody(paymentInput, NOW)
    expect(body.payInstrument.payDetails.product).toBe("NAGAR")
  })

  it("uses UPI subchannel UP in production when it is unset", () => {
    process.env.NODE_ENV = "production"
    process.env.PAYMENT_PROVIDER = "atom"
    delete process.env.ATOM_SUB_CHANNEL
    const provider = new AtomNdpsProvider()
    const body = provider.authRequestBody(paymentInput, NOW)
    expect(body.payInstrument.payModeSpecificData).toEqual({ subChannel: "UP" })
  })

  it("encrypts the auth request with the request IV as PBKDF2 key and salt", async () => {
    const reqIv = "A4476C2062FFA58980DC8F79EB6A799E"
    process.env.ATOM_AES_REQUEST_IV = reqIv
    process.env.ATOM_AES_RESPONSE_IV = reqIv
    delete process.env.ATOM_AES_REQUEST_KEY
    process.env.ATOM_AUTH_URL = "https://payment1.atomtech.in/ots/aipay/auth"
    const provider = new AtomNdpsProvider()
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response)
    try {
      await provider.createPayment(paymentInput)
      const call = fetchMock.mock.calls.find((args) =>
        String(args[0]).includes("payment1.atomtech.in")
      )
      const init = call?.[1] as RequestInit
      const params = new URLSearchParams(String(init.body))
      const plain = atomAesDecrypt(params.get("encData") ?? "", reqIv, reqIv)
      expect(JSON.parse(plain).payInstrument.merchDetails.password).toBe(
        "txn-pass"
      )
      expect(String(init.body)).not.toContain(reqIv)
      expect(String(init.body)).not.toContain("txn-pass")
    } finally {
      fetchMock.mockRestore()
    }
  })

  it("posts refunds to the configured refund URL signed with the request hash key", async () => {
    const reqIv = "A4476C2062FFA58980DC8F79EB6A799E"
    const resIv = "75AEF0FA1B94B3C10D4F5B268F757F11"
    process.env.ATOM_AES_REQUEST_IV = reqIv
    process.env.ATOM_AES_RESPONSE_IV = resIv
    delete process.env.ATOM_AES_REQUEST_KEY
    delete process.env.ATOM_AES_RESPONSE_KEY
    delete process.env.ATOM_API_SECRET_KEY
    process.env.ATOM_REFUND_URL =
      "https://payment.atomtech.in/ots/payment/refund"
    process.env.ATOM_REQ_HASH_KEY = "KEY123657234"
    process.env.ATOM_PASSWORD = "Test@123"
    process.env.ATOM_MERCH_ID = "317157"
    process.env.ATOM_PRODUCT = "NAGAR"
    delete process.env.ProductID
    const responsePlain = JSON.stringify({
      payInstrument: {
        responseDetails: { statusCode: "OTS0000", message: "SUCCESS" },
        payDetails: { atomTxnId: 11000000460337 },
      },
    })
    const responseEnc = atomAesEncrypt(responsePlain, resIv, resIv)
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `merchId=317157&encData=${responseEnc}`,
    } as Response)
    try {
      const provider = new AtomNdpsProvider()
      const result = await provider.refund({
        merchTxnId: "6545e02c9d835",
        atomTxnId: "11000000460337",
        amount: 5,
      })
      expect(result.success).toBe(true)
      const call = fetchMock.mock.calls.find((args) =>
        String(args[0]).includes("payment.atomtech.in")
      )
      expect(call?.[0]).toBe("https://payment.atomtech.in/ots/payment/refund")
      const init = call?.[1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded")
      expect(headers.Authorization).toBeUndefined()
      const params = new URLSearchParams(String(init.body))
      const plain = atomAesDecrypt(params.get("encData") ?? "", reqIv, reqIv)
      const parsed = JSON.parse(plain) as {
        payInstrument: {
          payDetails: { signature: string }
          merchDetails: { password: string }
        }
      }
      expect(parsed.payInstrument.payDetails.signature).toBe(
        "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d"
      )
      expect(parsed.payInstrument.merchDetails.password).toBe("Test@123")
      expect(String(init.body)).not.toContain("KEY123657234")
      expect(String(init.body)).not.toContain("Test@123")
    } finally {
      fetchMock.mockRestore()
    }
  })

  it("does not decrypt with the request key when the response salt is missing", () => {
    const reqKey = "A4476C2062FFA58980DC8F79EB6A799E"
    process.env.ATOM_AES_REQUEST_KEY = reqKey
    process.env.ATOM_AES_REQUEST_IV = reqKey
    const provider = new AtomNdpsProvider()
    const encData = atomAesEncrypt("{}", reqKey, reqKey)
    expect(() => provider.decryptPayload(encData)).toThrow(/required/)
  })
})

describe("status and refund payloads", () => {
  it("puts the integer amount and status signature on the status request", () => {
    const body = buildAtomStatusPayload({
      merchId: "317157",
      merchTxnId: "63d12a8782587dda",
      amount: 1.9,
      merchTxnDate: "2024-01-16",
      reqHashKey: "KEY123657234",
    })
    expect(body.payInstrument.payDetails.amount).toBe(1)
    expect(body.payInstrument.payDetails.signature).toBe(
      "6b704f0931032fa58b9a693d226819d0227506deb24365c795e0c29653e287ca4b71ba461caac0dcb2eabafa19f2fc85f6c09e2fc12da4bfdc1f4c456ea02f6b"
    )
    expect(body.payInstrument.merchDetails.merchTxnDate).toBe("2024-01-16")
  })

  it("uses REFUNDINIT, the product name, and the refund signature", () => {
    const body = buildAtomRefundPayload({
      merchId: "317157",
      password: "Test@123",
      merchTxnId: "6545e02c9d835",
      atomTxnId: "11000000460337",
      amount: 5,
      product: "NAGAR",
      reqHashKey: "KEY123657234",
      prodRefundId: "refund1",
    })
    expect(body.payInstrument.headDetails.api).toBe("REFUNDINIT")
    expect(body.payInstrument.payDetails.prodDetails[0]).toEqual({
      prodName: "NAGAR",
      prodRefundId: "refund1",
      prodRefundAmount: 5,
    })
    expect(body.payInstrument.payDetails.signature).toBe(
      "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d"
    )
  })
})
