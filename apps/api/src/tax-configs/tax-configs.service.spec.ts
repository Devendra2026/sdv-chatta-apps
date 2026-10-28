import { Test, TestingModule } from "@nestjs/testing"

import { AuditService } from "../audit/audit.service"
import { PrismaService } from "../prisma/prisma.service"
import { TaxConfigsService } from "./tax-configs.service"

const roadId = "road-below-9m"
const constructionId = "const-rcc"
const assessmentYearId = "ay-2026"

const nonZeroCells = [
  {
    roadWidthEntryId: roadId,
    constructionEntryId: constructionId,
    annualRatePerSqFt: 0.36,
  },
]

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "cfg-source",
    wardId: "ward-1",
    assessmentYearId,
    status: "DRAFT",
    version: 1,
    propertyTaxPct: 10,
    waterTaxPct: 7.5,
    drainageTaxPct: 2.5,
    penaltyPct: 0,
    assessablePct: 80,
    commercialAssessablePct: 80,
    cells: [
      {
        roadWidthEntryId: roadId,
        constructionEntryId: constructionId,
        annualRatePerSqFt: 0,
      },
    ],
    ...overrides,
  }
}

describe("TaxConfigsService copy/publish with client rates", () => {
  let service: TaxConfigsService
  let prisma: {
    taxConfig: {
      findUnique: jest.Mock
      findUniqueOrThrow: jest.Mock
      create: jest.Mock
      update: jest.Mock
    }
    taxRateCell: { upsert: jest.Mock }
    taxConfigVersion: { create: jest.Mock }
    ward: { findMany: jest.Mock; findUnique: jest.Mock }
    referenceEntry: { findUnique: jest.Mock; findMany: jest.Mock }
    $transaction: jest.Mock
  }
  let audit: { log: jest.Mock }

  beforeEach(async () => {
    prisma = {
      taxConfig: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      taxRateCell: { upsert: jest.fn().mockResolvedValue({}) },
      taxConfigVersion: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: "ver-1",
          ...data,
        })),
      },
      ward: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      referenceEntry: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    }
    audit = { log: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxConfigsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile()

    service = module.get(TaxConfigsService)
  })

  it("copyToAllWards with cells writes those rates onto a published ward and bumps version", async () => {
    const source = makeConfig({
      id: "cfg-source",
      wardId: "ward-1",
      status: "PUBLISHED",
      version: 4,
    })
    const publishedTarget = makeConfig({
      id: "cfg-ward-2",
      wardId: "ward-2",
      status: "PUBLISHED",
      version: 2,
    })

    prisma.taxConfig.findUnique
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(publishedTarget)
      .mockResolvedValue(publishedTarget)

    prisma.taxConfig.findUniqueOrThrow.mockResolvedValue({
      ...publishedTarget,
      cells: nonZeroCells,
      version: 3,
    })
    prisma.taxConfig.update.mockResolvedValue({
      ...publishedTarget,
      version: 3,
      cells: nonZeroCells,
    })
    prisma.ward.findMany.mockResolvedValue([{ id: "ward-2" }])

    const result = await service.copyToAllWards(
      {
        sourceWardId: "ward-1",
        assessmentYearId,
        cells: nonZeroCells,
        propertyTaxPct: 10,
        waterTaxPct: 7.5,
        drainageTaxPct: 2.5,
        penaltyPct: 0,
        assessablePct: 80,
        commercialAssessablePct: 80,
      },
      "user-1"
    )

    expect(result.updated).toBeGreaterThanOrEqual(1)
    expect(prisma.taxRateCell.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ annualRatePerSqFt: 0.36 }),
        update: expect.objectContaining({ annualRatePerSqFt: 0.36 }),
      })
    )
    expect(prisma.taxConfigVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taxConfigId: "cfg-ward-2",
          version: 3,
          snapshot: expect.objectContaining({
            cells: expect.arrayContaining([
              expect.objectContaining({ annualRatePerSqFt: 0.36 }),
            ]),
          }),
        }),
      })
    )
  })

  it("publish with cells snapshots the provided rates, not stored zeros", async () => {
    const draft = makeConfig({
      id: "cfg-draft",
      status: "DRAFT",
      version: 1,
      cells: [
        {
          roadWidthEntryId: roadId,
          constructionEntryId: constructionId,
          annualRatePerSqFt: 0,
        },
      ],
    })

    prisma.taxConfig.findUnique
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce({
        ...draft,
        cells: nonZeroCells,
        propertyTaxPct: 10,
        waterTaxPct: 7.5,
        drainageTaxPct: 2.5,
        penaltyPct: 0,
        assessablePct: 80,
        commercialAssessablePct: 80,
      })

    prisma.taxConfig.findUniqueOrThrow.mockResolvedValue({
      ...draft,
      cells: nonZeroCells,
    })
    prisma.taxConfigVersion.create.mockResolvedValue({
      id: "ver-1",
      version: 1,
    })
    prisma.taxConfig.update.mockResolvedValue({
      ...draft,
      status: "PUBLISHED",
      version: 1,
      cells: nonZeroCells,
    })

    await service.publish(
      "cfg-draft",
      {
        cells: nonZeroCells,
        propertyTaxPct: 10,
        waterTaxPct: 7.5,
        drainageTaxPct: 2.5,
        penaltyPct: 0,
        assessablePct: 80,
        commercialAssessablePct: 80,
      },
      "user-1"
    )

    expect(prisma.taxRateCell.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ annualRatePerSqFt: 0.36 }),
        update: expect.objectContaining({ annualRatePerSqFt: 0.36 }),
      })
    )
    expect(prisma.taxConfigVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          snapshot: expect.objectContaining({
            cells: expect.arrayContaining([
              expect.objectContaining({ annualRatePerSqFt: 0.36 }),
            ]),
          }),
        }),
      })
    )
  })
})
