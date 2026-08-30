import { PrismaClient } from "@prisma/client"

import { seedDatabase } from "../src/db/seed-database"

const prisma = new PrismaClient()

seedDatabase(prisma)
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown seed error"
    console.error(`[seed] ${message}`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
