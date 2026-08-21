import { Controller, Get } from "@nestjs/common"

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

  @Get("api/v1/health")
  healthV1() {
    return {
      success: true,
      data: {
        status: "ok",
        service: "api",
        timestamp: new Date().toISOString(),
      },
    }
  }
}
