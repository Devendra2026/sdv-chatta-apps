import {
  buildAuthRequestDiagnostic,
  buildGatewayDiagnosticEvent,
  maskEmail,
  maskMobile,
} from "./atom-diagnostics"

describe("maskEmail / maskMobile", () => {
  it("masks local part of email", () => {
    expect(maskEmail("customer@example.com")).toBe("c***r@example.com")
  })

  it("masks mobile keeping last 4 digits", () => {
    expect(maskMobile("9876543210")).toBe("******3210")
  })
})

describe("buildAuthRequestDiagnostic", () => {
  const sample = {
    payInstrument: {
      headDetails: {
        version: "OTSv1.1",
        api: "AUTH",
        platform: "FLASH",
      },
      merchDetails: {
        merchId: "858781",
        userId: "",
        password: "secret-password",
        merchTxnId: "CHH-1",
        merchTxnDate: "2026-11-13 10:00:00",
      },
      payDetails: {
        amount: "552.39",
        product: "NAGAR",
        custAccNo: "ACC-1",
        txnCurrency: "INR",
      },
      custDetails: {
        custEmail: "payer@example.com",
        custMobile: "9876543210",
      },
      extras: {
        udf1: "",
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: "",
      },
    },
  }

  it("reports field presence without leaking password", () => {
    const diag = buildAuthRequestDiagnostic(sample, true)
    expect(diag.validationOk).toBe(true)
    expect(diag.merchDetails.password.valid).toBe(true)
    expect(diag.merchDetails.password.note).toBe("value redacted")
    expect(JSON.stringify(diag)).not.toContain("secret-password")
    expect(diag.custDetails.custMobile.type).toBe("string")
    expect(diag.payModeSpecificData.present).toBe(false)
    expect(diag.merchDetails.merchId.valid).toBe(true)
  })

  it("records optional subChannel when present", () => {
    const withUp = {
      payInstrument: {
        ...sample.payInstrument,
        payModeSpecificData: { subChannel: "UP" },
      },
    }
    const diag = buildAuthRequestDiagnostic(withUp, true)
    expect(diag.payModeSpecificData).toEqual({
      present: true,
      subChannel: "UP",
    })
  })
})

describe("buildGatewayDiagnosticEvent", () => {
  it("adds timestamp and keeps safe fields", () => {
    const event = buildGatewayDiagnosticEvent({
      event: "atom.auth",
      merchTxnId: "CHH-1",
      merchId: "858781",
      tokenGenerated: true,
      endpoint: "aipay/auth",
      httpStatus: 200,
    })
    expect(event.event).toBe("atom.auth")
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(event.tokenGenerated).toBe(true)
  })
})
