import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { StorageModule } from "../storage/storage.module"
import { SurveysController } from "./surveys.controller"
import { SurveysService } from "./surveys.service"

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
