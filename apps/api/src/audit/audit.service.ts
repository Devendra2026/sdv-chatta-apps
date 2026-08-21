import { Injectable } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    action: string
    entity: string
    entityId?: string
    oldValue?: Prisma.InputJsonValue
    newValue?: Prisma.InputJsonValue
    actorId?: string
    ipAddress?: string
    requestId?: string
    metadata?: Prisma.InputJsonValue
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        actorId: input.actorId,
        ipAddress: input.ipAddress,
        requestId: input.requestId,
        metadata: input.metadata,
      },
    })
  }
}
