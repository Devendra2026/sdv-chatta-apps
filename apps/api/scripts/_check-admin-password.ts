import "dotenv/config"

import { verifyPassword } from "../src/auth/password-hash"
import { createPrismaClient } from "../src/prisma/prisma.client"

async function main() {
  const prisma = createPrismaClient()
  try {
    const user = await prisma.user.findUnique({
      where: { email: "sikarwar2010@gmail.com" },
    })
    const hash = user?.passwordHash ?? ""
    const envPw = process.env.SEED_ADMIN_PASSWORD ?? ""
    const examplePw = "tarun@0446"
    const envMatch = hash ? await verifyPassword(envPw, hash) : false
    const exampleMatch = hash ? await verifyPassword(examplePw, hash) : false
    console.log(
      JSON.stringify({
        envLen: envPw.length,
        envMatch,
        exampleLen: examplePw.length,
        exampleMatch,
        hashPrefix: hash.slice(0, 10),
      })
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
