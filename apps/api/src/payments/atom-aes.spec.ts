import { atomAesDecrypt, atomAesEncrypt } from "./providers/atom-aes"
import {
  AtomNdpsProvider,
  extractAtomTxnFields,
} from "./providers/atom-ndps.provider"

/** Public Atom sandbox keys published in NDPS UAT docs (not merchant secrets). */
const UAT_REQ_KEY = "A4476C2062FFA58980DC8F79EB6A799E"
const UAT_RES_KEY = "75AEF0FA1B94B3C10D4F5B268F757F11"

describe("atomAes (AtomAES PBKDF2)", () => {
  it("round-trips plaintext with UAT-style request key/salt", () => {
    const plain = JSON.stringify({
      payInstrument: {
        merchDetails: { merchTxnId: "CHH-test-1" },
        responseDetails: { statusCode: "OTS0000", message: "SUCCESS" },
      },
    })
    const enc = atomAesEncrypt(plain, UAT_REQ_KEY, UAT_REQ_KEY)
    expect(enc).toMatch(/^[0-9A-F]+$/)
    expect(atomAesDecrypt(enc, UAT_REQ_KEY, UAT_REQ_KEY)).toBe(plain)
  })

  it("decrypts with response key when encrypt used response key as salt pair", () => {
    const plain = '{"ok":true}'
    const enc = atomAesEncrypt(plain, UAT_RES_KEY, UAT_RES_KEY)
    expect(atomAesDecrypt(enc, UAT_RES_KEY, UAT_RES_KEY)).toBe(plain)
  })

  it("rejects missing key/salt", () => {
    expect(() => atomAesEncrypt("x", "", UAT_REQ_KEY)).toThrow(/required/)
    expect(() => atomAesDecrypt("00", UAT_REQ_KEY, "")).toThrow(/required/)
  })
})

describe("extractAtomTxnFields", () => {
  it("reads nested payInstrument callback shape", () => {
    const fields = extractAtomTxnFields({
      payInstrument: {
        merchDetails: { merchTxnId: "CHH-1" },
        payDetails: { atomTxnId: 987654321, amount: "1500.00" },
        responseDetails: { statusCode: "OTS0000", message: "SUCCESS" },
      },
    })
    expect(fields.merchTxnId).toBe("CHH-1")
    expect(fields.atomTxnId).toBe("987654321")
    expect(fields.statusCode).toBe("OTS0000")
    expect(fields.gatewayAmount).toBe(1500)
  })

  it("reads flat payload fields", () => {
    const fields = extractAtomTxnFields({
      merchTxnId: "CHH-2",
      atomTxnId: "ATM-1",
      statusCode: "SUCCESS",
      redirectUrl: "https://example.test/pay",
    })
    expect(fields).toMatchObject({
      merchTxnId: "CHH-2",
      atomTxnId: "ATM-1",
      statusCode: "SUCCESS",
      redirectUrl: "https://example.test/pay",
    })
  })
})

describe("AtomNdpsProvider decryptPayload + nested SUCCESS", () => {
  const saved: Record<string, string | undefined> = {}

  beforeAll(() => {
    for (const key of [
      "ATOM_AES_RESPONSE_KEY",
      "ATOM_AES_RESPONSE_IV",
      "ATOM_AES_REQUEST_KEY",
      "ATOM_AES_REQUEST_IV",
    ]) {
      saved[key] = process.env[key]
    }
    process.env.ATOM_AES_RESPONSE_KEY = UAT_RES_KEY
    process.env.ATOM_AES_RESPONSE_IV = UAT_RES_KEY
    process.env.ATOM_AES_REQUEST_KEY = UAT_REQ_KEY
    process.env.ATOM_AES_REQUEST_IV = UAT_REQ_KEY
  })

  afterAll(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it("decrypts encData into OTS0000 nested fields", () => {
    const provider = new AtomNdpsProvider()
    const nested = {
      payInstrument: {
        merchDetails: { merchTxnId: "CHH-enc-1" },
        payDetails: { atomTxnId: "ATM-enc-9" },
        responseDetails: { statusCode: "OTS0000", message: "SUCCESS" },
      },
    }
    const encData = atomAesEncrypt(
      JSON.stringify(nested),
      UAT_RES_KEY,
      UAT_RES_KEY
    )
    const decoded = provider.decryptPayload(encData)
    const fields = extractAtomTxnFields(decoded)
    expect(fields.merchTxnId).toBe("CHH-enc-1")
    expect(fields.atomTxnId).toBe("ATM-enc-9")
    expect(fields.statusCode).toBe("OTS0000")
  })
})

describe("gateway return URL builder", () => {
  it("derives gateway/return from callback URL", () => {
    const callback = "http://localhost:4000/api/v1/payments/gateway/callback"
    const derived = callback.replace("/gateway/callback", "/gateway/return")
    expect(derived).toBe("http://localhost:4000/api/v1/payments/gateway/return")
  })

  it("appends merchTxnId to citizen return URL", () => {
    const base = "http://localhost:3001/propertytax/payment/return"
    const url = new URL(base)
    url.searchParams.set("merchTxnId", "CHH-9")
    expect(url.toString()).toContain("merchTxnId=CHH-9")
  })
})
