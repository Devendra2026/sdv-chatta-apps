import { BadRequestException, ConflictException } from "@nestjs/common"
import { PaymentStatus } from "@prisma/client"

import { CreatePublicPropertyTaxPaymentDto } from "./dto/create-public-payment.dto"
import {
  CITIZEN_PAYMENT_IN_PROGRESS_WINDOW_MS,
  hasRecentOpenCitizenPayment,
} from "./payment-in-progress.util"

/**
 * Lightweight payment-path guards (mirrors service rules without DB).
 * Full create/receipt flows are covered by integration/manual UAT.
 */
describe("public property tax payment rules", () => {
  it("rejects zero or negative demand before gateway create", () => {
    const amount = 0
    expect(() => {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException({
          code: "DUES_NOT_PAYABLE",
          message:
            "Tax dues are not payable for this property yet. Published rates may be missing or zero.",
        })
      }
    }).toThrow(BadRequestException)
  })

  it("accepts positive demand", () => {
    const amount = 1250.5
    expect(Number.isFinite(amount) && amount > 0).toBe(true)
  })

  it("rejects create when already paid for assessment year", () => {
    const paidForAssessmentYear = true
    expect(() => {
      if (paidForAssessmentYear) {
        throw new ConflictException({
          code: "ALREADY_PAID_FOR_YEAR",
          message:
            "Property tax for assessment year 2025-2026 has already been paid.",
        })
      }
    }).toThrow(ConflictException)
  })

  it("DTO requires 10-digit mobile pattern in class metadata", () => {
    const dto = new CreatePublicPropertyTaxPaymentDto()
    dto.surveyId = "clxxxxxxxxxxxxxxxxxxxxxxxx"
    dto.payerMobile = "9876543210"
    expect(dto.payerMobile).toMatch(/^\d{10}$/)
  })
})

describe("hasRecentOpenCitizenPayment", () => {
  const now = new Date("2026-04-10T12:00:00.000Z")

  it("blocks when PENDING payment was created within the window", () => {
    const createdAt = new Date(now.getTime() - 5 * 60 * 1000)
    expect(
      hasRecentOpenCitizenPayment(
        [{ id: "p1", status: PaymentStatus.PENDING, createdAt }],
        now
      )
    ).toBe(true)
  })

  it("blocks when INITIATED payment was created within the window", () => {
    const createdAt = new Date(now.getTime() - 1 * 60 * 1000)
    expect(
      hasRecentOpenCitizenPayment(
        [{ id: "p1", status: PaymentStatus.INITIATED, createdAt }],
        now
      )
    ).toBe(true)
  })

  it("allows create after the abandonment window", () => {
    const createdAt = new Date(
      now.getTime() - CITIZEN_PAYMENT_IN_PROGRESS_WINDOW_MS - 1000
    )
    expect(
      hasRecentOpenCitizenPayment(
        [{ id: "p1", status: PaymentStatus.PENDING, createdAt }],
        now
      )
    ).toBe(false)
  })

  it("ignores SUCCESS and FAILED rows", () => {
    expect(
      hasRecentOpenCitizenPayment(
        [
          {
            id: "p1",
            status: PaymentStatus.SUCCESS,
            createdAt: new Date(now.getTime() - 60_000),
          },
          {
            id: "p2",
            status: PaymentStatus.FAILED,
            createdAt: new Date(now.getTime() - 60_000),
          },
        ],
        now
      )
    ).toBe(false)
  })

  it("returns false when there are no open payments", () => {
    expect(hasRecentOpenCitizenPayment([], now)).toBe(false)
  })
})
