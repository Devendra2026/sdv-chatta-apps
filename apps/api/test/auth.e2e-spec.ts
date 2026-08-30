import { INestApplication } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { ExpressAdapter } from "@nestjs/platform-express"
import express from "express"
import request from "supertest"
import { App } from "supertest/types"

import { attachBetterAuthGate } from "../src/auth/better-auth.express"
import { HealthModule } from "../src/health/health.module"

describe("Better Auth Express gate (e2e)", () => {
  let app: INestApplication<App>
  let server: express.Express

  beforeAll(async () => {
    server = express()
    const gate = attachBetterAuthGate(server)
    gate.bind({} as never)

    app = await NestFactory.create(HealthModule, new ExpressAdapter(server), {
      bodyParser: false,
      logger: false,
    })
    await app.init()
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it("POST /api/auth/sign-in/email is not Nest Cannot POST after init", async () => {
    const res = await request(server)
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
    const res = await request(server)
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
    const res = await request(server).get("/api/auth/ok")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      url: "/ok",
      baseUrl: "/api/auth",
      originalUrl: "/api/auth/ok",
    })
  })

  it("GET /api/v1/health still reaches Nest", async () => {
    const res = await request(server).get("/api/v1/health")
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
