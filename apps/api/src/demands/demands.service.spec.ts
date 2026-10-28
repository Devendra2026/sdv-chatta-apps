import { ConflictException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import { DemandsService } from "./demands.service"

const assessmentYearId = "ay-2026"
const wardId = "ward-1"

function makeSurvey(overrides: Record<string, unknown> = {}) {
  return {
    id: "survey-1",
    surveyId: "249044-001-000001-001-P",
    ownerName: "Test Owner",
    mobile: null,
    propertyNo: null,
    parcelNo: null,
    houseNo: null,
    streetName: null,
    locality: null,
    colony: null,
    city: null,
    pincode: null,
    propertyUse: "Residential",
    taxRateZone: "Below 9m",
    roadType: null,
    hasMunicipalWaterSupply: true,
    plotAreaSqFt: 100,
    plinthAreaSqFt: 100,
    totalBuiltUpAreaSqFt: 100,
    wardId,
    ward: { id: wardId, number: 1, name: "Ward 1" },
    floors: [
      {
        floorLabel: "GF",
        usageType: "Residential",
        usageFactor: null,
        buildingType: "RCC / Pakka",
        areaSqFt: 100,
      },
    ],
    ...overrides,
  }
}

function makeTaxConfig() {
  return {
    id: "cfg-1",
    status: "PUBLISHED",
    version: 6,
    assessablePct: 80,
    commercialAssessablePct: 80,
    propertyTaxPct: 10,
    waterTaxPct: 7.5,
    drainageTaxPct: 0,
    penaltyPct: 0,
    updatedAt: new Date(),
    assessmentYear: {
      id: assessmentYearId,
      code: "AY_2026_2027",
      name: "2026-2027",
    },
    cells: [
      {
        roadWidthEntry: { code: "BELOW_9M" },
        constructionEntry: { code: "RCC_PAKKA" },
        annualRatePerSqFt: 0.6,
      },
    ],
  }
}

describe("DemandsService.publishForWard", () => {
  let service: DemandsService
  let prisma: {
    ward: { findUnique: jest.Mock }
    referenceEntry: { findUnique: jest.Mock }
    taxConfig: { findUnique: jest.Mock }
    taxAdjustmentRule: { findMany: jest.Mock }
    survey: { findMany: jest.Mock }
    propertyDemand: {
      findUnique: jest.Mock
      create: jest.Mock
      update: jest.Mock
    }
    payment: { aggregate: jest.Mock; findMany: jest.Mock }
  }
  let audit: { log: jest.Mock }

  beforeEach(async () => {
    prisma = {
      ward: { findUnique: jest.fn().mockResolvedValue({ id: wardId }) },
      referenceEntry: {
        findUnique: jest.fn().mockResolvedValue({
          id: assessmentYearId,
          category: { code: "ASSESSMENT_YEAR" },
        }),
      },
      taxConfig: { findUnique: jest.fn().mockResolvedValue(makeTaxConfig()) },
      taxAdjustmentRule: { findMany: jest.fn().mockResolvedValue([]) },
      survey: { findMany: jest.fn() },
      propertyDemand: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    audit = { log: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile()

    service = module.get(DemandsService)
  })

  it("creates published demands for active surveys", async () => {
    const survey = makeSurvey()
    prisma.survey.findMany
      .mockResolvedValueOnce([survey])
      .mockResolvedValueOnce([])
    prisma.propertyDemand.findUnique.mockResolvedValue(null)
    prisma.propertyDemand.create.mockResolvedValue({
      id: "demand-1",
      surveyId: survey.id,
      assessmentYearId,
      status: "PUBLISHED",
      totalPayable: 100,
      verified: true,
    })

    const result = await service.publishForWard(
      wardId,
      assessmentYearId,
      "user-1"
    )

    expect(result).toEqual({ created: 1, updated: 0, total: 1 })
    expect(prisma.propertyDemand.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          surveyId: survey.id,
          assessmentYearId,
          status: "PUBLISHED",
          arrears: 0,
        }),
      })
    )
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PUBLISH_WARD",
        newValue: expect.objectContaining({ created: 1, updated: 0 }),
      })
    )
  })

  it("preserves existing arrears and amount paid when updating", async () => {
    const survey = makeSurvey()
    prisma.survey.findMany
      .mockResolvedValueOnce([survey])
      .mockResolvedValueOnce([])
    prisma.propertyDemand.findUnique.mockResolvedValue({
      id: "demand-existing",
      arrears: 500,
      amountPaid: 200,
    })
    prisma.payment.aggregate.mockResolvedValue({
      _sum: { amount: 200 },
    })
    prisma.propertyDemand.update.mockResolvedValue({
      id: "demand-existing",
      status: "PUBLISHED",
      arrears: 500,
      amountPaid: 200,
      totalPayable: 700,
      verified: true,
    })

    const result = await service.publishForWard(
      wardId,
      assessmentYearId,
      "user-1"
    )

    expect(result).toEqual({ created: 0, updated: 1, total: 1 })
    expect(prisma.propertyDemand.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "demand-existing" },
        data: expect.objectContaining({
          status: "PUBLISHED",
          arrears: 500,
          amountPaid: 200,
        }),
      })
    )
  })

  it("skips inactive surveys by querying ACTIVE only", async () => {
    prisma.survey.findMany.mockResolvedValueOnce([])

    const result = await service.publishForWard(
      wardId,
      assessmentYearId,
      "user-1"
    )

    expect(result.total).toBe(0)
    expect(prisma.survey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          wardId,
          status: "ACTIVE",
          deletedAt: null,
        }),
      })
    )
    expect(prisma.propertyDemand.create).not.toHaveBeenCalled()
  })

  it("requires a published tax config", async () => {
    prisma.taxConfig.findUnique.mockResolvedValue({
      ...makeTaxConfig(),
      status: "DRAFT",
    })

    await expect(
      service.publishForWard(wardId, assessmentYearId, "user-1")
    ).rejects.toBeInstanceOf(ConflictException)
  })
})
