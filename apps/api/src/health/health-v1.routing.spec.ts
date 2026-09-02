import { Controller, Get, INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"

@Controller("api/v1")
class HealthV1Controller {
  @Get("health")
  health() {
    return { success: true, data: { status: "ok", service: "api" } }
  }
}

describe("Nest Express 5 health v1 routing", () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthV1Controller],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("GET /api/v1/health matches @Controller('api/v1') @Get('health')", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: true,
      data: { status: "ok", service: "api" },
    })
  })
})
