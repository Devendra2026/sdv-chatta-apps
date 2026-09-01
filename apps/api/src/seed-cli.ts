import "dotenv/config"

import { seedDatabase } from "./db/seed-database"
import { createPrismaClient } from "./prisma/prisma.client"

function redactSecrets(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://***:***@")
    .replace(/redis:\/\/:[^@\s]+@/gi, "redis://:***@")
}

async function main() {
  const prisma = createPrismaClient()
  try {
    await seedDatabase(prisma)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown seed error"
    console.error(
      `[seed] Database initialization failed. ${redactSecrets(message)}`
    )
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

void main()
