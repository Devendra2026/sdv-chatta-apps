import * as fs from "node:fs"
import * as path from "node:path"

import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces"
import pdfmake from "pdfmake"

import { formatInrAmountInWords } from "./inr-words"
import {
  buildReceiptAllocation,
  outstandingBeforeFromSnapshot,
} from "./receipt-allocation"

export type ReceiptPdfSurvey = {
  surveyId: string
  ownerName: string | null
  ownerFatherName: string | null
  mobile: string | null
  houseNo: string | null
  streetName: string | null
  locality: string | null
  colony: string | null
}

export type ReceiptPdfWard = {
  number: number
  name: string
}

export type ReceiptPdfSnapshot = {
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  rebate: number
  arrears: number
  totalPayable: number
  amountReceived: number
  outstandingAfter: number
  amountPaidAfter: number
  assessmentYear: { id: string; code: string; name: string } | null
  paymentMode: string
  receiptNumber: string
  paidAt: string
}

export type ReceiptPdfModel = {
  receiptNumber: string
  paymentId: string
  paymentStatus: string
  paymentMode: string
  amount: number
  collectionDate: string
  chequeDdReference: string | null
  propertyDemandId: string | null
  collectedBy: { id: string; name: string } | null
  survey: ReceiptPdfSurvey | null
  ward: ReceiptPdfWard | null
  receiptSnapshot: ReceiptPdfSnapshot | null
  /** When true, omit collector id and payment id from both copies (public citizen PDF). */
  publicCopy?: boolean
}

const BORDER = "#64748b"
const TEXT = "#0f172a"
const MUTED = "#334155"

let fontsReady = false

function assetsRoot(): string {
  // Compiled: dist/payments -> dist/assets; source/jest: src/payments -> src/assets
  return path.join(__dirname, "..", "assets")
}

function ensureFonts(): void {
  if (fontsReady) return
  const fontsDir = path.join(assetsRoot(), "fonts")
  // Variable Noto Sans Devanagari avoids a fontkit GPOS crash on glyphs like हे
  // that occurs with the static hinted TTFs under pdfkit/fontkit 2.x.
  const devanagari = path.join(fontsDir, "NotoSansDevanagari-Variable.ttf")
  const latinRegular = path.join(fontsDir, "NotoSans-Regular.ttf")
  const latinBold = path.join(fontsDir, "NotoSans-Bold.ttf")
  for (const file of [devanagari, latinRegular, latinBold]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Receipt PDF font missing: ${file}`)
    }
  }
  pdfmake.setFonts({
    Noto: {
      normal: devanagari,
      bold: devanagari,
      italics: devanagari,
      bolditalics: devanagari,
    },
    NotoSans: {
      normal: latinRegular,
      bold: latinBold,
      italics: latinRegular,
      bolditalics: latinBold,
    },
  })
  // Allow reading vendored assets (fonts + emblem) from disk.
  pdfmake.setLocalAccessPolicy((filePath: string) => {
    const resolved = path.resolve(filePath)
    const root = path.resolve(assetsRoot())
    const ok =
      resolved === root ||
      resolved.startsWith(root + path.sep) ||
      resolved.startsWith(root + "/")
    return ok
  })
  pdfmake.setUrlAccessPolicy(() => false)
  fontsReady = true
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function dash(value: string | null | undefined): string {
  const t = value?.trim()
  return t && t.length > 0 ? t : "—"
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

function formatMode(mode: string): string {
  switch (mode) {
    case "CASH":
      return "Cash / नकद"
    case "CHEQUE":
      return "Cheque / चेक"
    case "DD":
      return "Demand Draft / डीडी"
    case "UPI_MANUAL":
      return "UPI (Manual) / यूपीआई"
    case "ONLINE":
      return "Online / ऑनलाइन"
    case "OTHER":
      return "Other / अन्य"
    default:
      return mode
  }
}

function localityOf(survey: ReceiptPdfSurvey | null): string {
  if (!survey) return "—"
  return dash(survey.locality || survey.colony || survey.streetName)
}

function wardLabel(ward: ReceiptPdfWard | null): string {
  if (!ward) return "—"
  return `${String(ward.number).padStart(2, "0")} — ${ward.name}`
}

/** Filename-safe receipt number for Content-Disposition. */
export function safeReceiptFilename(receiptNumber: string): string {
  const safe = receiptNumber.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80)
  return `Property-Tax-Receipt-${safe || "unknown"}.pdf`
}

function cell(
  text: string,
  opts?: { bold?: boolean; align?: "left" | "right" | "center"; fontSize?: number }
): TableCell {
  return {
    text,
    bold: opts?.bold,
    alignment: opts?.align ?? "left",
    fontSize: opts?.fontSize ?? 6.5,
    color: TEXT,
    margin: [1, 0.5, 1, 0.5],
  }
}

function kvRow(label: string, value: string): TableCell[] {
  return [
    cell(label, { fontSize: 7 }),
    cell(value, { bold: true, fontSize: 7.5 }),
  ]
}

function sectionTitle(text: string): Content {
  return {
    text,
    bold: true,
    fontSize: 7,
    color: TEXT,
    margin: [0, 2, 0, 1],
  }
}

function buildCopy(
  model: ReceiptPdfModel,
  copyType: "office" | "consumer"
): Content[] {
  const snap = model.receiptSnapshot
  const survey = model.survey
  const yearName =
    snap?.assessmentYear?.name ??
    snap?.assessmentYear?.code ??
    "—"
  const paidAt = snap?.paidAt ?? model.collectionDate
  const amountReceived = snap?.amountReceived ?? model.amount
  const outstandingAfter = snap?.outstandingAfter ?? 0
  const totalPayable = snap?.totalPayable ?? amountReceived
  const amountPaidAfter = snap?.amountPaidAfter ?? amountReceived

  const outstandingBefore = snap
    ? outstandingBeforeFromSnapshot({
        totalPayable,
        amountPaidAfter,
        amountReceived,
        outstandingAfter,
      })
    : amountReceived

  const allocation = snap
    ? buildReceiptAllocation({
        propertyTax: snap.propertyTax,
        waterTax: snap.waterTax,
        drainageTax: snap.drainageTax,
        penalty: snap.penalty,
        rebate: snap.rebate,
        arrears: snap.arrears,
        amountPaidAfter,
        amountReceived,
        outstandingAfter,
        assessmentYearName: yearName === "—" ? null : yearName,
      })
    : null

  const isFull = outstandingAfter <= 0.005
  const statusLine = isFull
    ? "FULL PAYMENT RECEIVED / पूर्ण भुगतान प्राप्त"
    : `PARTIAL PAYMENT RECEIVED — ${money(outstandingAfter)} still due / आंशिक भुगतान प्राप्त — ${money(outstandingAfter)} शेष बकाया`

  const copyBanner =
    copyType === "office"
      ? "OFFICE COPY / कार्यालय प्रति"
      : "CONSUMER COPY / उपभोक्ता प्रति"

  const logoPath = path.join(assetsRoot(), "branding", "up-government-logo.png")

  const header: Content = {
    columns: [
      {
        width: 36,
        image: logoPath,
        fit: [34, 34],
      },
      {
        width: "*",
        alignment: "center",
        stack: [
          {
            text: "नगर पंचायत छाता",
            bold: true,
            fontSize: 10,
            color: TEXT,
          },
          {
            text: "Nagar Panchayat Chhata, Mathura, Uttar Pradesh",
            fontSize: 7,
            color: MUTED,
            margin: [0, 0, 0, 0],
          },
          {
            text: "संपत्ति कर रसीद / Property Tax Receipt",
            bold: true,
            fontSize: 9,
            margin: [0, 2, 0, 0],
            color: TEXT,
          },
        ],
      },
      { width: 36, text: "" },
    ],
    columnGap: 4,
    margin: [0, 0, 0, 2],
  }

  const banner: Content = {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: copyBanner,
            bold: true,
            alignment: "center",
            fontSize: 8,
            margin: [2, 3, 2, 3],
            color: TEXT,
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => BORDER,
      vLineColor: () => BORDER,
    },
    margin: [0, 0, 0, 2],
  }

  const meta: Content = {
    columns: [
      {
        width: "*",
        stack: [
          {
            text: [
              { text: "Receipt No. / रसीद सं. ", fontSize: 7, color: MUTED },
              {
                text: model.receiptNumber,
                bold: true,
                fontSize: 8,
              },
            ],
          },
        ],
      },
      {
        width: "*",
        stack: [
          {
            text: [
              { text: "Financial year / वित्तीय वर्ष ", fontSize: 7, color: MUTED },
              { text: yearName, bold: true, fontSize: 8 },
            ],
          },
        ],
      },
      {
        width: "*",
        stack: [
          {
            text: [
              { text: "Date & time / दिनांक ", fontSize: 7, color: MUTED },
              { text: formatWhen(paidAt), bold: true, fontSize: 8 },
            ],
          },
        ],
      },
    ],
    columnGap: 4,
    margin: [0, 0, 0, 2],
  }

  const assesseeRows: TableCell[][] = [
    [
      {
        text: "Assessee details / करदाता विवरण",
        bold: true,
        colSpan: 2,
        fontSize: 7.5,
        margin: [2, 2, 2, 2],
      },
      {},
    ],
    kvRow("PIN / Property ID / संपत्ति क्रमांक", dash(survey?.surveyId)),
    kvRow("Owner / occupant / स्वामी / अध्यासी", dash(survey?.ownerName)),
    kvRow("Father / husband / पिता / पति", dash(survey?.ownerFatherName)),
    kvRow("Ward / वार्ड", wardLabel(model.ward)),
    kvRow("House No. / मकान नं.", dash(survey?.houseNo)),
    kvRow("Locality / Mohalla / मोहल्ला", localityOf(survey)),
    kvRow("Mobile / मोबाइल", dash(survey?.mobile)),
    kvRow(
      "Demand ref. / मांग संदर्भ",
      dash(model.propertyDemandId)
    ),
  ]

  const taxRows: TableCell[][] = [
    [
      {
        text: "Tax details / कर विवरण",
        bold: true,
        colSpan: 2,
        fontSize: 7.5,
        margin: [2, 2, 2, 2],
      },
      {},
    ],
    kvRow(
      "Previous dues (arrears) / पूर्व बकाया",
      money(snap?.arrears ?? 0)
    ),
    kvRow("Property tax / संपत्ति कर", money(snap?.propertyTax ?? 0)),
    kvRow("Water tax / जल कर", money(snap?.waterTax ?? 0)),
    kvRow("Drainage tax / नाली कर", money(snap?.drainageTax ?? 0)),
    kvRow("Penalty / शास्ति", money(snap?.penalty ?? 0)),
    kvRow("Interest / ब्याज", money(0)),
    kvRow(
      "Rebate (less) / छूट (घटाएँ)",
      money(-(Math.abs(snap?.rebate ?? 0)))
    ),
    kvRow(
      "Total payable before this payment / इस भुगतान से पूर्व कुल देय",
      money(outstandingBefore)
    ),
  ]

  const sideTables: Content = {
    columns: [
      {
        width: "*",
        table: { widths: ["52%", "48%"], body: assesseeRows },
        layout: thinLayout(),
      },
      {
        width: "*",
        table: { widths: ["62%", "38%"], body: taxRows },
        layout: thinLayout(),
      },
    ],
    columnGap: 4,
    margin: [0, 0, 0, 2],
  }

  const summary: Content = {
    stack: [
      sectionTitle("Payment summary / भुगतान सारांश"),
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              cell("Outstanding before payment\nभुगतान से पूर्व बकाया", {
                bold: true,
                align: "center",
                fontSize: 7,
              }),
              cell("Amount received\nप्राप्त राशि", {
                bold: true,
                align: "center",
                fontSize: 7,
              }),
              cell("Balance due after payment\nभुगतान के बाद शेष", {
                bold: true,
                align: "center",
                fontSize: 7,
              }),
              cell("Payment mode\nभुगतान का प्रकार", {
                bold: true,
                align: "center",
                fontSize: 7,
              }),
            ],
            [
              cell(money(outstandingBefore), { bold: true, align: "center" }),
              cell(money(amountReceived), { bold: true, align: "center" }),
              cell(money(outstandingAfter), { bold: true, align: "center" }),
              cell(formatMode(model.paymentMode), {
                bold: true,
                align: "center",
                fontSize: 7,
              }),
            ],
          ],
        },
        layout: thinLayout(),
      },
      {
        text: statusLine,
        bold: true,
        alignment: "center",
        fontSize: 8,
        margin: [0, 2, 0, 1],
        color: TEXT,
      },
      {
        text: [
          {
            text: "Amount received in words / प्राप्त राशि शब्दों में: ",
            fontSize: 6.5,
            color: MUTED,
          },
          {
            text: formatInrAmountInWords(amountReceived),
            bold: true,
            fontSize: 7,
          },
        ],
        margin: [0, 0, 0, 2],
      },
    ],
  }

  const allocationBlock: Content = {
    stack: [
      sectionTitle("How this payment was applied / भुगतान का समायोजन"),
      {
        table: {
          widths: ["16%", "14%", "12%", "12%", "14%", "14%", "18%"],
          body: [
            [
              cell("Year\nवर्ष", { bold: true, align: "center", fontSize: 6.5 }),
              cell("Property tax\nसंपत्ति कर", {
                bold: true,
                align: "center",
                fontSize: 6.5,
              }),
              cell("Water tax\nजल कर", {
                bold: true,
                align: "center",
                fontSize: 6.5,
              }),
              cell("Drainage\nनाली कर", {
                bold: true,
                align: "center",
                fontSize: 6.5,
              }),
              cell("Penalty & interest\nशास्ति व ब्याज", {
                bold: true,
                align: "center",
                fontSize: 6.5,
              }),
              cell("Applied\nसमायोजित", {
                bold: true,
                align: "center",
                fontSize: 6.5,
              }),
              cell("Year balance after\nवर्ष का शेष", {
                bold: true,
                align: "center",
                fontSize: 6.5,
              }),
            ],
            [
              cell(allocation?.yearLabel ?? yearName, {
                align: "center",
                fontSize: 7,
              }),
              cell(money(allocation?.propertyTax ?? 0), {
                align: "right",
                fontSize: 7,
              }),
              cell(money(allocation?.waterTax ?? 0), {
                align: "right",
                fontSize: 7,
              }),
              cell(money(allocation?.drainageTax ?? 0), {
                align: "right",
                fontSize: 7,
              }),
              cell(money(allocation?.penaltyAndInterest ?? 0), {
                align: "right",
                fontSize: 7,
              }),
              cell(money(allocation?.amountApplied ?? amountReceived), {
                bold: true,
                align: "right",
                fontSize: 7,
              }),
              cell(money(allocation?.yearBalanceAfter ?? outstandingAfter), {
                align: "right",
                fontSize: 7,
              }),
            ],
          ],
        },
        layout: thinLayout(),
      },
    ],
    margin: [0, 0, 0, 2],
  }

  const showInternal =
    copyType === "office" && model.publicCopy !== true

  const reconciliation: Content | null = showInternal
    ? {
        stack: [
          sectionTitle(
            "Office reconciliation / कार्यालय मिलान (internal)"
          ),
          {
            columns: [
              {
                width: "*",
                text: [
                  { text: "Payment ID ", fontSize: 6, color: MUTED },
                  { text: model.paymentId, fontSize: 6, bold: true },
                ],
              },
              {
                width: "auto",
                text: [
                  { text: "Status ", fontSize: 6, color: MUTED },
                  { text: model.paymentStatus, fontSize: 6, bold: true },
                ],
              },
              {
                width: "*",
                text: [
                  {
                    text: "Collector / संग्रहकर्ता ",
                    fontSize: 6,
                    color: MUTED,
                  },
                  {
                    text: dash(model.collectedBy?.name),
                    fontSize: 6,
                    bold: true,
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 1],
          },
          {
            columns: [
              {
                width: "*",
                text: [
                  { text: "Collector id ", fontSize: 6, color: MUTED },
                  {
                    text: dash(model.collectedBy?.id),
                    fontSize: 6,
                  },
                ],
              },
              {
                width: "*",
                text: [
                  { text: "Counter / काउंटर ", fontSize: 6, color: MUTED },
                  { text: "—", fontSize: 6, bold: true },
                ],
              },
              {
                width: "*",
                text: [
                  {
                    text: "Instrument ref. ",
                    fontSize: 6,
                    color: MUTED,
                  },
                  {
                    text: dash(model.chequeDdReference),
                    fontSize: 6,
                    bold: true,
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 1],
          },
          {
            text: [
              { text: "Printed / मुद्रित ", fontSize: 6, color: MUTED },
              {
                text: `${formatWhen(new Date().toISOString())}${
                  model.collectedBy?.name
                    ? ` · ${model.collectedBy.name}`
                    : ""
                }`,
                fontSize: 6,
                bold: true,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 2],
      }
    : null

  const receivedBy = dash(model.collectedBy?.name)
  const footer: Content =
    copyType === "office"
      ? {
          stack: [
            {
              columns: [
                {
                  width: "*",
                  text: [
                    {
                      text: "Received by / प्राप्तकर्ता: ",
                      fontSize: 7,
                      color: MUTED,
                    },
                    { text: receivedBy, fontSize: 7.5, bold: true },
                  ],
                },
                {
                  width: "*",
                  alignment: "right",
                  text: "Authorised signatory / अधिकृत हस्ताक्षर",
                  fontSize: 7,
                  color: MUTED,
                },
              ],
              margin: [0, 3, 0, 2],
            },
            {
              text: "This receipt is valid only for a payment recorded as successful. A cheque, draft or bank transfer is valid only after it is confirmed. A reprint is a copy of the original receipt and is not a new payment.",
              fontSize: 5.5,
              color: MUTED,
            },
          ],
        }
      : {
          stack: [
            {
              columns: [
                {
                  width: "*",
                  text: [
                    {
                      text: "Received by / प्राप्तकर्ता: ",
                      fontSize: 6.5,
                      color: MUTED,
                    },
                    { text: receivedBy, fontSize: 7, bold: true },
                  ],
                },
                {
                  width: "*",
                  alignment: "right",
                  stack: [
                    {
                      text: "Quote the receipt number for any query. / किसी भी पूछताछ हेतु रसीद संख्या बताएँ।",
                      fontSize: 5.5,
                      color: MUTED,
                    },
                    {
                      text: "Authorised signatory / अधिकृत हस्ताक्षर",
                      fontSize: 6.5,
                      color: MUTED,
                      margin: [0, 2, 0, 0],
                    },
                  ],
                },
              ],
              margin: [0, 3, 0, 2],
            },
            {
              text: "This receipt is valid only for a payment recorded as successful. A cheque, draft or bank transfer is valid only after it is confirmed. A reprint is a copy of the original receipt and is not a new payment.",
              fontSize: 5.5,
              color: MUTED,
            },
          ],
        }

  const parts: Content[] = [
    header,
    banner,
    meta,
    sideTables,
    summary,
    allocationBlock,
  ]
  if (reconciliation) parts.push(reconciliation)
  parts.push(footer)
  return parts
}

function thinLayout() {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => BORDER,
    vLineColor: () => BORDER,
    paddingLeft: () => 1,
    paddingRight: () => 1,
    paddingTop: () => 1,
    paddingBottom: () => 1,
  }
}

function cutLine(): Content {
  return {
    stack: [
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 520,
            y2: 0,
            lineWidth: 0.7,
            dash: { length: 3, space: 2 },
            lineColor: BORDER,
          },
        ],
        margin: [0, 4, 0, 1],
      },
      {
        text: "✂ cut here / यहाँ से काटें",
        alignment: "center",
        fontSize: 6.5,
        color: MUTED,
        margin: [0, 0, 0, 4],
      },
    ],
  }
}

export async function buildPropertyTaxReceiptPdf(
  model: ReceiptPdfModel
): Promise<Buffer> {
  ensureFonts()

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [14, 10, 14, 10],
    defaultStyle: {
      font: "Noto",
      fontSize: 7,
      color: TEXT,
    },
    content: [
      ...buildCopy(model, "office"),
      cutLine(),
      ...buildCopy(model, "consumer"),
    ],
    info: {
      title: `Property Tax Receipt ${model.receiptNumber}`,
      author: "Nagar Panchayat Chhata",
      subject: "Property tax payment receipt",
    },
  }

  const pdf = pdfmake.createPdf(docDefinition)
  const buffer = await pdf.getBuffer()
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
}

/** Build a PDF model from staff receipt JSON plus demand id. */
export function staffReceiptToPdfModel(
  receipt: {
    paymentId: string
    receiptNumber: string
    amount: number
    paymentMode: string
    status: string
    collectionDate: string
    chequeDdReference: string | null
    collectedBy: { id: string; name: string } | null
    survey: ReceiptPdfSurvey | null
    ward: ReceiptPdfWard | null
    receiptSnapshot?: ReceiptPdfSnapshot | null
  },
  propertyDemandId: string | null,
  options?: { publicCopy?: boolean }
): ReceiptPdfModel {
  return {
    receiptNumber: receipt.receiptNumber,
    paymentId: receipt.paymentId,
    paymentStatus: receipt.status,
    paymentMode: receipt.paymentMode,
    amount: receipt.amount,
    collectionDate: receipt.collectionDate,
    chequeDdReference: receipt.chequeDdReference,
    propertyDemandId,
    collectedBy: receipt.collectedBy,
    survey: receipt.survey
      ? {
          surveyId: receipt.survey.surveyId,
          ownerName: receipt.survey.ownerName,
          ownerFatherName: receipt.survey.ownerFatherName,
          mobile: receipt.survey.mobile,
          houseNo: receipt.survey.houseNo,
          streetName: receipt.survey.streetName,
          locality: receipt.survey.locality,
          colony: receipt.survey.colony,
        }
      : null,
    ward: receipt.ward
      ? { number: receipt.ward.number, name: receipt.ward.name }
      : null,
    receiptSnapshot: receipt.receiptSnapshot ?? null,
    publicCopy: options?.publicCopy,
  }
}
