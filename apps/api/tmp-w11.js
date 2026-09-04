require("dotenv").config()
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})
;(async () => {
  const s = await prisma.survey.findFirst({
    where: { surveyId: "249044-011-000001-001-C", deletedAt: null },
    select: {
      surveyId: true,
      taxRateZone: true,
      roadType: true,
      floorsRaw: true,
      plotAreaSqFt: true,
      plinthAreaSqFt: true,
      totalBuiltUpAreaSqFt: true,
      importJobId: true,
      floors: { select: { floorLabel: true, areaSqFt: true, rawSegment: true } },
    },
  })
  console.log(
    JSON.stringify(
      s,
      (_, v) =>
        typeof v === "object" && v && typeof v.toNumber === "function"
          ? v.toNumber()
          : v,
      2
    )
  )
  if (s?.importJobId) {
    const j = await prisma.importJob.findUnique({
      where: { id: s.importJobId },
      select: { mappingPreset: true, fileName: true, objectKey: true },
    })
    console.log("JOB", j)
  }
  await prisma.$disconnect()
})().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
