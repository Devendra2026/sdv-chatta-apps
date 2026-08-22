/**
 * Re-process a completed import job with UPDATE duplicate strategy
 * to fix column-shifted survey rows from an earlier bad import.
 *
 * Usage: pnpm --filter api exec tsx scripts/repair-import.ts <jobId>
 */
import "dotenv/config"

import { DuplicateStrategy } from "@prisma/client"
import { NestFactory } from "@nestjs/core"

import { AppModule } from "../src/app.module"
import { ImportsService } from "../src/imports/imports.service"

async function main() {
  const jobId = process.argv[2]
  if (!jobId) {
    console.error("Usage: tsx scripts/repair-import.ts <importJobId>")
    process.exit(1)
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  })

  try {
    const imports = app.get(ImportsService)
    console.log(`Re-processing import job ${jobId} with UPDATE strategy…`)
    const result = await imports.reprocessJob(jobId, DuplicateStrategy.UPDATE)
    console.log("Repair complete:", {
      status: result.status,
      processedRows: result.processedRows,
      insertedRows: result.insertedRows,
      updatedRows: result.updatedRows,
      skippedRows: result.skippedRows,
      failedRows: result.failedRows,
    })
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
