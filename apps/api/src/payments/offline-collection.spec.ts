import { BadRequestException, NotFoundException } from "@nestjs/common"
import { PaymentMode, PaymentStatus } from "@prisma/client"

/**
 * Mirrors offline counter rules without a DB (same pattern as public payment specs).
 */
function assertOfflineCreateInput(input: {
  amount: number
  paymentMode: PaymentMode
  surveyId?: string
  chequeDdReference?: string
  surveyExists?: boolean
}) {
  if (input.paymentMode === PaymentMode.ONLINE) {
    throw new BadRequestException("Use online endpoint for gateway payments")
  }
  if (!input.surveyId?.trim()) {
    throw new BadRequestException({
      code: "SURVEY_REQUIRED",
      message: "Select a property/survey before recording offline payment",
    })
  }
  const needsRef = new Set([
    PaymentMode.CHEQUE,
    PaymentMode.DD,
    PaymentMode.UPI_MANUAL,
  ])
  if (needsRef.has(input.paymentMode) && !input.chequeDdReference?.trim()) {
    throw new BadRequestException({
      code: "REFERENCE_REQUIRED",
      message: "Cheque / DD / UPI reference is required for this payment mode",
    })
  }
  if (input.surveyExists === false) {
    throw new NotFoundException({
      code: "SURVEY_NOT_FOUND",
      message: "Property/survey was not found",
    })
  }
}

function toStaffReceiptShape(payment: {
  id: string
  paymentReference: string
  receiptNumber: string | null
  amount: number
  currency: string
  paymentMode: PaymentMode
  status: PaymentStatus
  payerName: string | null
  payerMobile: string | null
  chequeDdReference: string | null
  remarks: string | null
  collectionDate: Date
  collectedBy: { id: string; name: string } | null
  survey: {
    id: string
    surveyId: string
    ownerName: string | null
    ownerFatherName: string | null
    mobile: string | null
    houseNo: string | null
    streetName: string | null
    locality: string | null
    colony: string | null
    city: string | null
    pincode: string | null
  } | null
  ward: { id: string; number: number; name: string; code: string } | null
}) {
  if (payment.status !== PaymentStatus.SUCCESS) {
    throw new BadRequestException({
      code: "RECEIPT_NOT_AVAILABLE",
      message: "Receipt is only available for successful payments",
    })
  }
  const survey = payment.survey
  const addressParts = survey
    ? [
        survey.houseNo,
        survey.streetName,
        survey.locality,
        survey.colony,
        survey.city ?? "Nagar Panchayat Chhata",
        survey.pincode,
      ].filter(Boolean)
    : []

  return {
    paymentId: payment.id,
    paymentReference: payment.paymentReference,
    receiptNumber: payment.receiptNumber ?? payment.paymentReference,
    amount: payment.amount,
    currency: payment.currency,
    paymentMode: payment.paymentMode,
    status: payment.status,
    payerName: payment.payerName,
    payerMobile: payment.payerMobile,
    chequeDdReference: payment.chequeDdReference,
    remarks: payment.remarks,
    collectionDate: payment.collectionDate.toISOString(),
    collectedBy: payment.collectedBy,
    survey: survey
      ? {
          id: survey.id,
          surveyId: survey.surveyId,
          ownerName: survey.ownerName,
          ownerFatherName: survey.ownerFatherName,
          mobile: survey.mobile,
          address: addressParts.length > 0 ? addressParts.join(", ") : null,
        }
      : null,
    ward: payment.ward,
  }
}

describe("offline collection rules", () => {
  it("requires surveyId", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CASH,
      })
    ).toThrow(BadRequestException)
  })

  it("requires reference for cheque", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CHEQUE,
        surveyId: "clsurvey",
      })
    ).toThrow(BadRequestException)
  })

  it("accepts cash with survey", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CASH,
        surveyId: "clsurvey",
        surveyExists: true,
      })
    ).not.toThrow()
  })

  it("rejects missing survey record", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CASH,
        surveyId: "missing",
        surveyExists: false,
      })
    ).toThrow(NotFoundException)
  })
})

describe("staff receipt payload", () => {
  it("includes owner, father/husband address, and receipt number", () => {
    const receipt = toStaffReceiptShape({
      id: "pay1",
      paymentReference: "OFF-1",
      receiptNumber: "RCP-BOOK-9",
      amount: 1250.5,
      currency: "INR",
      paymentMode: PaymentMode.CASH,
      status: PaymentStatus.SUCCESS,
      payerName: "Ram Singh",
      payerMobile: "9876543210",
      chequeDdReference: null,
      remarks: "Counter",
      collectionDate: new Date("2026-08-26T10:00:00.000Z"),
      collectedBy: { id: "u1", name: "Clerk" },
      survey: {
        id: "s1",
        surveyId: "CHH-001",
        ownerName: "Ram Singh",
        ownerFatherName: "Shyam Singh",
        mobile: "9876543210",
        houseNo: "12",
        streetName: "Main Road",
        locality: "Chhata",
        colony: null,
        city: "Mathura",
        pincode: "281401",
      },
      ward: { id: "w1", number: 3, name: "Ward 3", code: "W03" },
    })

    expect(receipt.receiptNumber).toBe("RCP-BOOK-9")
    expect(receipt.survey?.ownerFatherName).toBe("Shyam Singh")
    expect(receipt.survey?.address).toContain("Main Road")
    expect(receipt.collectedBy?.name).toBe("Clerk")
    expect(receipt.amount).toBe(1250.5)
  })

  it("rejects non-success payments for receipt", () => {
    expect(() =>
      toStaffReceiptShape({
        id: "pay2",
        paymentReference: "OFF-2",
        receiptNumber: null,
        amount: 100,
        currency: "INR",
        paymentMode: PaymentMode.CASH,
        status: PaymentStatus.PENDING,
        payerName: null,
        payerMobile: null,
        chequeDdReference: null,
        remarks: null,
        collectionDate: new Date(),
        collectedBy: null,
        survey: null,
        ward: null,
      })
    ).toThrow(BadRequestException)
  })
})
