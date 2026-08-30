import "dotenv/config"

import { seedDatabase } from "../src/db/seed-database"
import { createPrismaClient } from "../src/prisma/prisma.client"

const prisma = createPrismaClient()

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
