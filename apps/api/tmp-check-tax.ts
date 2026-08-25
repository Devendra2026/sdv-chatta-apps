import { PrismaClient } from "@prisma/client"

async function main() {
  const p = new PrismaClient()
  const cfg = await p.taxConfig.findFirst({
    where: { status: "PUBLISHED" },
    include: {
      assessmentYear: true,
      cells: { include: { roadWidthEntry: true, constructionEntry: true } },
      ward: true,
    },
  })
  console.log(
    JSON.stringify(
      {
        ward: cfg?.ward.number,
        year: cfg?.assessmentYear.code,
        cells: cfg?.cells.slice(0, 12).map((c) => ({
          road: c.roadWidthEntry.code,
          cons: c.constructionEntry.code,
          rate: c.annualRatePerSqFt.toString(),
        })),
        cellCount: cfg?.cells.length,
      },
      null,
      2
    )
  )
  await p.$disconnect()
}

main()
