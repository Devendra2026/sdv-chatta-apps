import { Module } from "@nestjs/common"

import { HealthController, HealthV1Controller } from "./health.controller"

@Module({
  controllers: [HealthController, HealthV1Controller],
})
export class HealthModule {}
