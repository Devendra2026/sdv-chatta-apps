import { PrismaClient } from "@prisma/client"
import "dotenv/config"

const p = new PrismaClient()
const rows = await p.payment.findMany({
  where: { paymentMode: "ONLINE" },
  orderBy: { createdAt: "desc" },
  take: 5,
  select: {
    merchTxnId: true,
    status: true,
    amount: true,
    gateway: true,
    createdAt: true,
  },
})
console.log(JSON.stringify(rows, null, 2))
await p.$disconnect()
