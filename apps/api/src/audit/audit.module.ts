import { Global, Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { AuditLogsController } from "./audit-logs.controller"
import { AuditService } from "./audit.service"

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
