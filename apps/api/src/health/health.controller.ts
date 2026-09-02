import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common"

import { Public } from "../auth/auth.decorators"
import { getApiRuntimeInfo } from "./api-runtime-info"
import { getRoutesVerifiedState } from "./route-verification-state"

@Public()
@Controller()
export class HealthController {
  @Get()
  root() {
    return "Hello World!"
  }

  @Get("health")
  health() {
    return { status: "ok" }
  }
}

@Public()
@Controller("api/v1")
export class HealthV1Controller {
  @Get("health")
  healthV1() {
    const runtime = getApiRuntimeInfo()
    return {
      success: true,
      data: {
        status: "ok",
        service: runtime.service,
        buildId: runtime.buildId,
        pid: runtime.pid,
        nodeEnv: runtime.nodeEnv,
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Readiness: returns 503 until bootstrap verifies critical routes
   * (including GET /api/v1/auth/me → 401, not 404).
   */
  @Get("ready")
  ready() {
    const runtime = getApiRuntimeInfo()
    const { routesVerifiedAt, verifiedRoutes } = getRoutesVerifiedState()

    if (!routesVerifiedAt || verifiedRoutes.length === 0) {
      throw new ServiceUnavailableException({
        code: "NOT_READY",
        message: "API routes are not fully registered",
      })
    }

    return {
      success: true,
      data: {
        status: "ready",
        service: runtime.service,
        buildId: runtime.buildId,
        pid: runtime.pid,
        nodeEnv: runtime.nodeEnv,
        routesVerifiedAt,
        routesVerified: verifiedRoutes.map((r) => r.route),
        timestamp: new Date().toISOString(),
      },
    }
  }
}
