import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { ImportWorker } from "./import.worker"
import { ExportsController, ImportsController } from "./imports.controller"
import { ImportsService } from "./imports.service"

@Module({
  imports: [AuthModule],
  controllers: [ImportsController, ExportsController],
  providers: [ImportsService, ImportWorker],
  exports: [ImportsService],
})
export class ImportsModule {}
