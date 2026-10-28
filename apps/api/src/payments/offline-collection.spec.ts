import { BadRequestException, NotFoundException } from "@nestjs/common"
import { PaymentMode, PaymentStatus } from "@prisma/client"

import {
  assertOfflineAmountAgainstOutstanding,
  assertOfflinePaymentMode,
  assertOfflineReference,
  assertPublishedDemandPresent,
  computeOutstandingAfterPayment,
} from "./offline-rules"
import { buildReceiptSnapshot } from "./receipt-snapshot"

/**
 * Mirrors offline counter rules without a DB (same pattern as public payment specs).
 */
function assertOfflineCreateInput(input: {
  amount: number
  paymentMode: PaymentMode
  surveyId?: string
  chequeDdReference?: string
  surveyExists?: boolean
  demandPublished?: boolean
  outstanding?: number
}) {
  assertOfflinePaymentMode(input.paymentMode)
  if (!input.surveyId?.trim()) {
    throw new BadRequestException({
      code: "SURVEY_REQUIRED",
      message: "Select a property/survey before recording offline payment",
    })
  }
  assertOfflineReference(input.paymentMode, input.chequeDdReference)
  if (input.surveyExists === false) {
    throw new NotFoundException({
      code: "SURVEY_NOT_FOUND",
      message: "Property/survey was not found",
    })
  }
  assertPublishedDemandPresent(
    input.demandPublished === false
      ? null
      : { status: "PUBLISHED" }
  )
  assertOfflineAmountAgainstOutstanding(
    input.amount,
    input.outstanding ?? input.amount
  )
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
  receiptSnapshot?: ReturnType<typeof buildReceiptSnapshot> | null
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
    receiptSnapshot: payment.receiptSnapshot ?? null,
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
        demandPublished: true,
        outstanding: 500,
      })
    ).toThrow(BadRequestException)
  })

  it("requires reference for cheque", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CHEQUE,
        surveyId: "clsurvey",
        demandPublished: true,
        outstanding: 500,
      })
    ).toThrow(BadRequestException)
  })

  it("accepts cash with survey and published demand", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CASH,
        surveyId: "clsurvey",
        surveyExists: true,
        demandPublished: true,
        outstanding: 500,
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
        demandPublished: true,
        outstanding: 500,
      })
    ).toThrow(NotFoundException)
  })

  it("rejects when demand is unpublished", () => {
    expect(() =>
      assertOfflineCreateInput({
        amount: 500,
        paymentMode: PaymentMode.CASH,
        surveyId: "clsurvey",
        surveyExists: true,
        demandPublished: false,
        outstanding: 500,
      })
    ).toThrow(BadRequestException)
  })

  it("rejects amount exceeding outstanding", () => {
    expect(() =>
      assertOfflineAmountAgainstOutstanding(3001, 3000)
    ).toThrow(BadRequestException)
  })

  it("rejects zero or negative amount", () => {
    expect(() => assertOfflineAmountAgainstOutstanding(0, 5000)).toThrow(
      BadRequestException
    )
    expect(() => assertOfflineAmountAgainstOutstanding(-10, 5000)).toThrow(
      BadRequestException
    )
  })

  it("partial payment leaves remaining outstanding (5000 / 3000 / 2000)", () => {
    const after = computeOutstandingAfterPayment(5000, 0, 3000)
    expect(after.amountPaid).toBe(3000)
    expect(after.outstanding).toBe(2000)
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

  it("shares one receiptSnapshot for consumer and office copies", () => {
    const snapshot = buildReceiptSnapshot({
      propertyTax: 4000,
      waterTax: 500,
      drainageTax: 200,
      penalty: 300,
      rebate: 0,
      arrears: 0,
      currentDemand: 5000,
      totalPayable: 5000,
      amountReceived: 3000,
      outstandingAfter: 2000,
      amountPaidAfter: 3000,
      assessmentYear: { id: "y1", code: "2025-26", name: "2025-26" },
      surveyId: "s1",
      municipalSurveyId: "CHH-001",
      paymentMode: PaymentMode.CASH,
      receiptNumber: "RCP-1",
      paidAt: new Date("2026-08-26T10:00:00.000Z"),
    })

    const receipt = toStaffReceiptShape({
      id: "pay-snap",
      paymentReference: "OFF-SNAP",
      receiptNumber: "RCP-1",
      amount: 3000,
      currency: "INR",
      paymentMode: PaymentMode.CASH,
      status: PaymentStatus.SUCCESS,
      payerName: "Ram",
      payerMobile: null,
      chequeDdReference: null,
      remarks: null,
      collectionDate: new Date("2026-08-26T10:00:00.000Z"),
      collectedBy: null,
      receiptSnapshot: snapshot,
      survey: null,
      ward: null,
    })

    expect(receipt.receiptSnapshot?.amountReceived).toBe(3000)
    expect(receipt.receiptSnapshot?.outstandingAfter).toBe(2000)
    expect(receipt.receiptSnapshot?.totalPayable).toBe(5000)
    // Same snapshot object is used for both print copies
    expect(receipt.receiptSnapshot).toEqual(snapshot)
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
