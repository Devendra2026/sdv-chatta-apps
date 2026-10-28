import { Test, TestingModule } from "@nestjs/testing"

import { AuditService } from "../audit/audit.service"
import { DemandsService } from "../demands/demands.service"
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
    taxConfigVersion: {
      create: jest.Mock
      findFirst: jest.Mock
      update: jest.Mock
    }
    ward: { findMany: jest.Mock; findUnique: jest.Mock }
    referenceEntry: { findUnique: jest.Mock; findMany: jest.Mock }
    $transaction: jest.Mock
  }
  let audit: { log: jest.Mock }
  let demands: { publishForWard: jest.Mock }

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
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
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
    demands = {
      publishForWard: jest.fn().mockResolvedValue({
        created: 2,
        updated: 1,
        total: 3,
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxConfigsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: DemandsService, useValue: demands },
      ],
    }).compile()

    service = module.get(TaxConfigsService)
  })

  it("copyToAllWards from a published source stamps the source version on targets", async () => {
    const source = makeConfig({
      id: "cfg-source",
      wardId: "ward-1",
      status: "PUBLISHED",
      version: 6,
      cells: nonZeroCells,
    })
    const draftTarget = makeConfig({
      id: "cfg-ward-3",
      wardId: "ward-3",
      status: "DRAFT",
      version: 1,
    })

    prisma.taxConfig.findUnique
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(draftTarget)

    prisma.taxConfig.update.mockResolvedValue({
      ...draftTarget,
      status: "PUBLISHED",
      version: 6,
      cells: nonZeroCells,
    })
    prisma.ward.findMany.mockResolvedValue([{ id: "ward-1" }, { id: "ward-3" }])

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

    expect(result.updated).toBe(1)
    expect(result.version).toBe(6)
    expect(result.demands.total).toBe(6)
    expect(prisma.taxConfigVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taxConfigId: "cfg-ward-3",
          version: 6,
        }),
      })
    )
    expect(prisma.taxConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cfg-ward-3" },
        data: expect.objectContaining({
          status: "PUBLISHED",
          version: 6,
        }),
      })
    )
    expect(demands.publishForWard).toHaveBeenCalledWith(
      "ward-3",
      assessmentYearId,
      "user-1"
    )
    expect(demands.publishForWard).toHaveBeenCalledWith(
      "ward-1",
      assessmentYearId,
      "user-1"
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
      wardId: "ward-1",
      assessmentYearId,
    })

    const result = await service.publish(
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
    expect(demands.publishForWard).toHaveBeenCalledWith(
      "ward-1",
      assessmentYearId,
      "user-1"
    )
    expect(result.demands.total).toBe(3)
    expect(result.ratesUnchanged).toBe(false)
  })

  it("publish does not bump version when published rates are unchanged", async () => {
    const published = makeConfig({
      id: "cfg-published",
      status: "PUBLISHED",
      version: 6,
      cells: nonZeroCells,
    })

    prisma.taxConfig.findUnique.mockResolvedValue(published)
    prisma.taxConfig.update.mockResolvedValue({
      ...published,
      status: "PUBLISHED",
      version: 6,
    })

    const result = await service.publish(
      "cfg-published",
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

    expect(prisma.taxConfigVersion.create).not.toHaveBeenCalled()
    expect(prisma.taxConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 6 }),
      })
    )
    expect(demands.publishForWard).toHaveBeenCalled()
    expect(result.ratesUnchanged).toBe(true)
    expect(result.version).toBe(6)
  })
})
