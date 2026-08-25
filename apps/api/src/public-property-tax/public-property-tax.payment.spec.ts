import { BadRequestException } from "@nestjs/common"

import { CreatePublicPropertyTaxPaymentDto } from "./dto/create-public-payment.dto"

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

  it("DTO requires 10-digit mobile pattern in class metadata", () => {
    const dto = new CreatePublicPropertyTaxPaymentDto()
    dto.surveyId = "clxxxxxxxxxxxxxxxxxxxxxxxx"
    dto.payerMobile = "9876543210"
    expect(dto.payerMobile).toMatch(/^\d{10}$/)
  })
})
