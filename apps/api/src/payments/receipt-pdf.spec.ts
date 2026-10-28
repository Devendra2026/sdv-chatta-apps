import {
  buildPropertyTaxReceiptPdf,
  safeReceiptFilename,
  type ReceiptPdfModel,
} from "./receipt-pdf"

function fixture(overrides?: Partial<ReceiptPdfModel>): ReceiptPdfModel {
  return {
    receiptNumber: "RCP-CHH-TEST-250",
    paymentId: "pay_fixture_001",
    paymentStatus: "SUCCESS",
    paymentMode: "CASH",
    amount: 250,
    collectionDate: "2026-10-27T06:06:00.000Z",
    chequeDdReference: null,
    propertyDemandId: "demand_fixture_001",
    collectedBy: { id: "collector_id_abc", name: "Test Collector" },
    survey: {
      surveyId: "249044-001-000001-001-R",
      ownerName: "राम प्रसाद",
      ownerFatherName: "श्याम लाल",
      mobile: "9876543210",
      houseNo: "12",
      streetName: null,
      locality: "छाता बाजार",
      colony: null,
    },
    ward: { number: 1, name: "Ward 1" },
    receiptSnapshot: {
      propertyTax: 192,
      waterTax: 144,
      drainageTax: 0,
      penalty: 0,
      rebate: 26.4,
      arrears: 0,
      totalPayable: 309.6,
      amountReceived: 250,
      outstandingAfter: 59.6,
      amountPaidAfter: 250,
      assessmentYear: {
        id: "ay1",
        code: "AY_2025_2026",
        name: "2025-2026",
      },
      paymentMode: "CASH",
      receiptNumber: "RCP-CHH-TEST-250",
      paidAt: "2026-10-27T06:06:00.000Z",
    },
    ...overrides,
  }
}

async function extractPdfText(buffer: Buffer): Promise<{
  pageCount: number
  width: number
  height: number
  text: string
}> {
  // pdfjs-dist 3.x ships a CommonJS build that Jest can load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjs = require("pdfjs-dist/build/pdf.js") as {
    getDocument: (src: { data: Uint8Array; disableWorker?: boolean }) => {
      promise: Promise<{
        numPages: number
        getPage: (n: number) => Promise<{
          getViewport: (o: { scale: number }) => { width: number; height: number }
          getTextContent: () => Promise<{
            items: Array<{ str?: string }>
          }>
        }>
      }>
    }
  }
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
  }).promise
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  // pdf.js may insert spaces between shaped glyphs; normalize for assertions.
  const text = content.items
    .map((item) => item.str ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  return {
    pageCount: doc.numPages,
    width: viewport.width,
    height: viewport.height,
    text,
  }
}

describe("safeReceiptFilename", () => {
  it("sanitizes receipt numbers", () => {
    expect(safeReceiptFilename("RCP/CHH 1")).toBe(
      "Property-Tax-Receipt-RCP_CHH_1.pdf"
    )
  })
})

describe("buildPropertyTaxReceiptPdf", () => {
  it("builds a one-page A4 PDF with both copy banners", async () => {
    const buffer = await buildPropertyTaxReceiptPdf(fixture())
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF")

    const { pageCount, width, height, text } = await extractPdfText(buffer)
    expect(pageCount).toBe(1)
    expect(Math.abs(width - 595.28)).toBeLessThan(1)
    expect(Math.abs(height - 841.89)).toBeLessThan(1)

    expect(text).toContain("OFFICE COPY")
    expect(text).toContain("CONSUMER COPY")
    // Hindi title is embedded; pdf.js may normalize conjuncts when extracting.
    expect(text).toContain("Property Tax Receipt")
    expect(text).toContain("कर रसीद")
    expect(text.replace(/\s+/g, "")).toContain("RCP-CHH-TEST-250")
    expect(text).toMatch(/250\.00/)
    expect(text).toContain("Rupees Two Hundred Fifty Only")
    expect(text).toMatch(/cut here/)
    expect(text).toContain("नगर पंचायत छाता")

    const officeIdx = text.indexOf("OFFICE COPY")
    const consumerIdx = text.indexOf("CONSUMER COPY")
    expect(officeIdx).toBeGreaterThanOrEqual(0)
    expect(consumerIdx).toBeGreaterThan(officeIdx)

    expect(text).toContain("collector_id_abc")
    expect(
      text.split("collector_id_abc").length - 1
    ).toBe(1)
  }, 30_000)

  it("omits collector id on publicCopy", async () => {
    const buffer = await buildPropertyTaxReceiptPdf(
      fixture({ publicCopy: true })
    )
    const { text } = await extractPdfText(buffer)
    expect(text).not.toContain("collector_id_abc")
    expect(text).toContain("OFFICE COPY")
    expect(text).toContain("CONSUMER COPY")
  }, 30_000)

  it("handles missing optional fields", async () => {
    const buffer = await buildPropertyTaxReceiptPdf(
      fixture({
        survey: {
          surveyId: "249044-001-000002-001-R",
          ownerName: null,
          ownerFatherName: null,
          mobile: null,
          houseNo: null,
          streetName: null,
          locality: null,
          colony: null,
        },
        chequeDdReference: null,
        collectedBy: null,
        propertyDemandId: null,
      })
    )
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF")
    const { text } = await extractPdfText(buffer)
    expect(text).toContain("OFFICE COPY")
  }, 30_000)

  it("handles a long Hindi owner name without throwing", async () => {
    const longName =
      "श्रीमती सुमन देवी पत्नी स्वर्गीय श्री रामकिशोर शर्मा निवासी छाता मथुरा उत्तर प्रदेश भारत"
    const buffer = await buildPropertyTaxReceiptPdf(
      fixture({
        survey: {
          surveyId: "249044-001-000003-001-R",
          ownerName: longName,
          ownerFatherName: longName,
          mobile: "9999999999",
          houseNo: "बहुत-लंबा-मकान-नंबर-१२३४५६७८९०",
          streetName: null,
          locality: longName,
          colony: null,
        },
      })
    )
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF")
    const { text } = await extractPdfText(buffer)
    expect(text).toContain("OFFICE COPY")
    expect(text).toContain("CONSUMER COPY")
  }, 30_000)
})
