import { Injectable } from "@nestjs/common"

import { pingRedis } from "../common/redis.client"
import { PrismaService } from "../prisma/prisma.service"
import { getRoutesVerifiedState } from "./route-verification-state"

export type DependencyHealth = {
  postgres: boolean
  redis: boolean
  routesRegistered: boolean
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkDependencies(): Promise<DependencyHealth> {
    const { routesVerifiedAt, verifiedRoutes } = getRoutesVerifiedState()
    const [postgres, redis] = await Promise.all([
      this.postgresReady(),
      pingRedis(),
    ])
    return {
      postgres,
      redis,
      routesRegistered: Boolean(routesVerifiedAt && verifiedRoutes.length > 0),
    }
  }

  async postgresReady(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }
}
