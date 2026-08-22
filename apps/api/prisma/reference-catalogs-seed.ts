import type { PrismaClient } from "@prisma/client"

type CatalogSeed = {
  code: string
  name: string
  description: string
  iconKey: string
  sortOrder: number
  entries: Array<{
    code: string
    name: string
    description?: string
    value?: string
    sortOrder: number
  }>
}

export const REFERENCE_CATALOGS: CatalogSeed[] = [
  {
    code: "ASSESSMENT_YEAR",
    name: "Assessment Years",
    description: "Financial assessment years for tax configurations",
    iconKey: "Calendar",
    sortOrder: 1,
    entries: [
      {
        code: "AY_2025_2026",
        name: "2025-2026",
        value: "2025-2026",
        sortOrder: 1,
      },
      {
        code: "AY_2026_2027",
        name: "2026-2027",
        value: "2026-2027",
        sortOrder: 2,
      },
    ],
  },
  {
    code: "TAX_RATE_ZONE",
    name: "Road Width / Tax Zones",
    description: "Road-width buckets for the tax rate matrix",
    iconKey: "Ruler",
    sortOrder: 2,
    entries: [
      { code: "BELOW_9M", name: "Below 9m", value: "<9m", sortOrder: 1 },
      {
        code: "METER_9_TO_12",
        name: "9m to 12m",
        value: "9-12m",
        sortOrder: 2,
      },
      {
        code: "METER_12_TO_24",
        name: "12m to 24m",
        value: "12-24m",
        sortOrder: 3,
      },
      { code: "ABOVE_24M", name: "Above 24m", value: ">24m", sortOrder: 4 },
    ],
  },
  {
    code: "CONSTRUCTION_TYPE",
    name: "Construction Types",
    description: "Construction types for tax rate matrix columns",
    iconKey: "Hammer",
    sortOrder: 3,
    entries: [
      {
        code: "PAKKA_BUILDING_WITH_RCC_ROOF",
        name: "RCC / Pakka",
        value: "RCC",
        sortOrder: 1,
      },
      { code: "TIN_SHED", name: "Tin Shed", value: "TIN", sortOrder: 2 },
      {
        code: "KACCHA_BUILDING",
        name: "Kachcha",
        value: "KACHCHA",
        sortOrder: 3,
      },
      { code: "OPEN_LAND", name: "Open Land", value: "OPEN", sortOrder: 4 },
      {
        code: "UNDER_CONSTRUCTION",
        name: "Under Construction",
        value: "UC",
        sortOrder: 5,
      },
    ],
  },
]

export async function seedReferenceCatalogs(prisma: PrismaClient) {
  for (const catalog of REFERENCE_CATALOGS) {
    const category = await prisma.referenceCategory.upsert({
      where: { code: catalog.code },
      update: {
        name: catalog.name,
        description: catalog.description,
        iconKey: catalog.iconKey,
        sortOrder: catalog.sortOrder,
      },
      create: {
        code: catalog.code,
        name: catalog.name,
        description: catalog.description,
        iconKey: catalog.iconKey,
        sortOrder: catalog.sortOrder,
      },
    })

    for (const entry of catalog.entries) {
      await prisma.referenceEntry.upsert({
        where: {
          categoryId_code: {
            categoryId: category.id,
            code: entry.code,
          },
        },
        update: {
          name: entry.name,
          description: entry.description,
          value: entry.value,
          sortOrder: entry.sortOrder,
          status: "ACTIVE",
        },
        create: {
          categoryId: category.id,
          code: entry.code,
          name: entry.name,
          description: entry.description,
          value: entry.value,
          sortOrder: entry.sortOrder,
          status: "ACTIVE",
        },
      })
    }
  }
}
