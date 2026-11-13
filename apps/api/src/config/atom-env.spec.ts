import { describeAtomRuntimeConfig } from "./atom-env"

describe("describeAtomRuntimeConfig", () => {
  it("shows the effective product code and its source, without secrets", () => {
    const line = describeAtomRuntimeConfig({
      PAYMENT_PROVIDER: "atom",
      ATOM_PRODUCT: "NSE",
      ProductID: "NAGAR",
      ATOM_SUB_CHANNEL: "",
      ATOM_CUST_ACC_NO: "acct-secret-ish",
      ATOM_MERCH_ID: "858781",
      ATOM_PASSWORD: "pw-should-not-appear",
      ATOM_AES_REQUEST_IV: "0123456789abcdef0123456789abcdef",
      ATOM_AUTH_URL: "https://payment1.atomtech.in/ots/aipay/auth",
      ATOM_CHECKOUT_CDN:
        "https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js",
      ATOM_CHECKOUT_ENV: "prod",
    })
    expect(line).toContain("product=NAGAR (from ProductID)")
    expect(line).toContain("subChannel=none (all enabled modes)")
    expect(line).toContain("custAccNo=set")
    expect(line).toContain("authHost=payment1.atomtech.in")
    expect(line).toContain("checkoutCdnHost=psa.atomtech.in")
    expect(line).toContain("checkoutEnv=prod")
    for (const secret of [
      "858781",
      "pw-should-not-appear",
      "0123456789abcdef",
      "acct-secret-ish",
    ]) {
      expect(line).not.toContain(secret)
    }
  })

  it("flags a restricting subChannel and a kit-sample product", () => {
    const line = describeAtomRuntimeConfig({
      ATOM_PRODUCT: "NSE",
      ATOM_SUB_CHANNEL: "UP",
    })
    expect(line).toContain("product=NSE (from ATOM_PRODUCT)")
    expect(line).toContain("subChannel=UP")
    expect(line).toContain("custAccNo=missing")
    expect(line).toContain("provider=unset")
  })
})
