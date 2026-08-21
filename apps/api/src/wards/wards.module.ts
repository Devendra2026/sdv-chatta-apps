import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { WardsController } from "./wards.controller"

@Module({
  imports: [AuthModule],
  controllers: [WardsController],
})
export class WardsModule {}
