import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { Worker } from "bullmq"

import { createBullMqRedisConnection } from "../common/redis.client"
import { ImportsService } from "./imports.service"

@Injectable()
export class ImportWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportWorker.name)
  private worker: Worker | null = null

  constructor(private readonly importsService: ImportsService) {}

  onModuleInit() {
    try {
      const connection = createBullMqRedisConnection()
      this.worker = new Worker(
        "survey-import",
        async (job) => {
          const jobId = job.data.jobId as string
          const pruneMissing = job.data.pruneMissing === true
          this.logger.log(`Processing import ${jobId}`)
          await this.importsService.processJob(jobId, { pruneMissing })
        },
        { connection }
      )
      this.worker.on("failed", (job, err) => {
        this.logger.error(`Import job ${job?.id} failed: ${err.message}`)
      })
    } catch (err) {
      this.logger.warn(`Import worker not started: ${String(err)}`)
    }
  }

  async onModuleDestroy() {
    await this.worker?.close()
  }
}
