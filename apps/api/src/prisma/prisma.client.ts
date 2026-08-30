import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

export function prismaClientOptions() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  return { adapter: new PrismaPg({ connectionString }) }
}

export function createPrismaClient() {
  return new PrismaClient(prismaClientOptions())
}
