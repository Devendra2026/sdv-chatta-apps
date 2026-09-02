import { Controller, Get } from "@nestjs/common"

import { Public } from "../auth/auth.decorators"

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
