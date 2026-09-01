import { Controller, Get, INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"

@Controller("api/v1/auth")
class NestedAuthController {
  @Get("me")
  me() {
    return { success: true, data: { id: "nested" } }
  }
}

@Controller()
class FullPathAuthController {
  @Get("api/v1/auth/me-full")
  me() {
    return { success: true, data: { id: "full" } }
  }
}

describe("Nest Express 5 auth/me routing", () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NestedAuthController, FullPathAuthController],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("GET /api/v1/auth/me matches @Controller('api/v1/auth') @Get('me')", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/auth/me")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { id: "nested" } })
  })

  it("GET /api/v1/auth/me-full matches @Controller() @Get('api/v1/auth/me-full')", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/auth/me-full")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { id: "full" } })
  })
})
