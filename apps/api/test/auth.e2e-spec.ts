import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AuthService } from "../src/auth/auth.service"
import { BetterAuthMiddleware } from "../src/auth/better-auth.middleware"
import { HealthModule } from "../src/health/health.module"

@Module({
  providers: [
    { provide: AuthService, useValue: { auth: {} } },
    BetterAuthMiddleware,
  ],
})
class AuthMiddlewareTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BetterAuthMiddleware).forRoutes("{*splat}")
  }
}

describe("Better Auth catch-all (e2e)", () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule, AuthMiddlewareTestModule],
    }).compile()

    app = moduleFixture.createNestApplication({ bodyParser: false })
    await app.init()
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it("POST /api/auth/sign-in/email is routed to Better Auth", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .set("content-type", "application/json")
      .send({ email: "staff@example.com", password: "secret12" })

    expect(res.text).not.toMatch(/Cannot POST/i)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      url: "/sign-in/email",
      baseUrl: "/api/auth",
      originalUrl: "/api/auth/sign-in/email",
    })
  })

  it("POST /api/auth/sign-in/social is routed to Better Auth", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/sign-in/social")
      .set("content-type", "application/json")
      .send({ provider: "google" })

    expect(res.text).not.toMatch(/Cannot POST/i)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      url: "/sign-in/social",
      baseUrl: "/api/auth",
      originalUrl: "/api/auth/sign-in/social",
    })
  })

  it("GET /api/auth/ok is routed to Better Auth", async () => {
    const res = await request(app.getHttpServer()).get("/api/auth/ok")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      url: "/ok",
      baseUrl: "/api/auth",
      originalUrl: "/api/auth/ok",
    })
  })
})
