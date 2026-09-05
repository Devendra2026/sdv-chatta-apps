import { createHmac } from "node:crypto"

import { atomAesEncrypt } from "./atom-aes"
import {
  AtomCallbackParseError,
  AtomNdpsProvider,
  parseAtomEncryptedCallback,
} from "./atom-ndps.provider"
import {
  assertAtomCallbackSignatureIfConfigured,
  verifyAtomCallbackSignature,
} from "./atom-hmac"

const OFFICIAL_RESP_HASH_KEY = "KEYRESP123657234"
const UAT_RES_KEY = "75AEF0FA1B94B3C10D4F5B268F757F11"

const officialCallback = {
  payInstrument: {
    merchDetails: {
      merchId: 317157,
      merchTxnId: "Test123450",
    },
    payDetails: {
      atomTxnId: "11000000679315",
      totalAmount: 1,
      signature: "",
    },
    responseDetails: {
      statusCode: "OTS0000",
    },
    payModeSpecificData: {
      subChannel: ["CC"],
      bankDetails: {
        bankTxnId: "0011000000679315624",
      },
    },
  },
}

function officialSignatureHex() {
  const signatureString =
    "317157" +
    "11000000679315" +
    "Test123450" +
    "1.00" +
    "OTS0000" +
    "CC" +
    "0011000000679315624"
  return createHmac("sha512", OFFICIAL_RESP_HASH_KEY)
    .update(signatureString)
    .digest("hex")
}

describe("verifyAtomCallbackSignature", () => {
  it("accepts the official NTT DATA callback concatenation", () => {
    const signed = structuredClone(officialCallback)
    signed.payInstrument.payDetails.signature = officialSignatureHex()
    expect(verifyAtomCallbackSignature(signed, OFFICIAL_RESP_HASH_KEY)).toBe(
      true
    )
  })

  it("rejects a tampered amount", () => {
    const signed = structuredClone(officialCallback)
    signed.payInstrument.payDetails.signature = officialSignatureHex()
    signed.payInstrument.payDetails.totalAmount = 2
    expect(verifyAtomCallbackSignature(signed, OFFICIAL_RESP_HASH_KEY)).toBe(
      false
    )
  })

  it("rejects a missing signature", () => {
    expect(
      verifyAtomCallbackSignature(officialCallback, OFFICIAL_RESP_HASH_KEY)
    ).toBe(false)
  })
})

describe("assertAtomCallbackSignatureIfConfigured", () => {
  const previous = process.env.ATOM_RESP_HASH_KEY

  afterEach(() => {
    if (previous === undefined) delete process.env.ATOM_RESP_HASH_KEY
    else process.env.ATOM_RESP_HASH_KEY = previous
  })

  it("skips verification when the hash key is unset", () => {
    delete process.env.ATOM_RESP_HASH_KEY
    expect(() =>
      assertAtomCallbackSignatureIfConfigured(officialCallback)
    ).not.toThrow()
  })

  it("rejects an invalid signature when the hash key is set", () => {
    process.env.ATOM_RESP_HASH_KEY = OFFICIAL_RESP_HASH_KEY
    expect(() =>
      assertAtomCallbackSignatureIfConfigured(officialCallback)
    ).toThrow(AtomCallbackParseError)
  })
})

describe("parseAtomEncryptedCallback HMAC gate", () => {
  const saved: Record<string, string | undefined> = {}

  beforeAll(() => {
    for (const key of [
      "ATOM_AES_RESPONSE_KEY",
      "ATOM_AES_RESPONSE_IV",
      "ATOM_RESP_HASH_KEY",
    ]) {
      saved[key] = process.env[key]
    }
    process.env.ATOM_AES_RESPONSE_KEY = UAT_RES_KEY
    process.env.ATOM_AES_RESPONSE_IV = UAT_RES_KEY
  })

  afterAll(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  afterEach(() => {
    delete process.env.ATOM_RESP_HASH_KEY
  })

  it("rejects callbacks without encData", () => {
    const provider = new AtomNdpsProvider()
    expect(() => parseAtomEncryptedCallback({}, provider)).toThrow(
      /encData/i
    )
  })

  it("accepts encrypted callbacks when HMAC is not configured", () => {
    const provider = new AtomNdpsProvider()
    const encData = atomAesEncrypt(
      JSON.stringify(officialCallback),
      UAT_RES_KEY,
      UAT_RES_KEY
    )
    const parsed = parseAtomEncryptedCallback({ encData }, provider)
    expect(parsed.fields.statusCode).toBe("OTS0000")
  })

  it("rejects encrypted callbacks with a bad HMAC when configured", () => {
    process.env.ATOM_RESP_HASH_KEY = OFFICIAL_RESP_HASH_KEY
    const provider = new AtomNdpsProvider()
    const encData = atomAesEncrypt(
      JSON.stringify(officialCallback),
      UAT_RES_KEY,
      UAT_RES_KEY
    )
    expect(() => parseAtomEncryptedCallback({ encData }, provider)).toThrow(
      /signature/i
    )
  })
})
