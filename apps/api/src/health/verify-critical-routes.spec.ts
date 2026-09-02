import { INestApplication } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import request from "supertest"

import { AuditModule } from "../audit/audit.module"
import { AuthGuard } from "../auth/auth.guard"
import { AuthModule } from "../auth/auth.module"
import { PermissionGuard } from "../auth/permission.guard"
import { RolesGuard } from "../auth/roles.guard"
import { CsrfController } from "../common/csrf.controller"
import { CsrfGuard } from "../common/csrf.guard"
import { HealthModule } from "./health.module"
import {
  markRoutesVerified,
  resetRoutesVerifiedStateForTests,
} from "./route-verification-state"
import {
  CRITICAL_API_ROUTES,
  verifyCriticalRoutes,
} from "./verify-critical-routes"
import { PrismaModule } from "../prisma/prisma.module"
import { PrismaService } from "../prisma/prisma.service"

describe("verifyCriticalRoutes", () => {
  let app: INestApplication

  const prisma = {
    user: { findUnique: jest.fn(async () => null) },
    session: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  }

  beforeAll(async () => {
    resetRoutesVerifiedStateForTests()
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, AuthModule, HealthModule],
      controllers: [CsrfController],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    resetRoutesVerifiedStateForTests()
  })

  it("defines auth/me probe expecting 401 (route exists, auth required)", () => {
    const authMe = CRITICAL_API_ROUTES.find(
      (r) => r.path === "/api/v1/auth/me"
    )
    expect(authMe).toEqual({
      method: "GET",
      path: "/api/v1/auth/me",
      allowedStatuses: [401],
    })
  })

  it("verifies all critical routes in one pass", async () => {
    const results = await verifyCriticalRoutes(app)
    markRoutesVerified(results)
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.map((r) => r.route)).toContain("GET /api/v1/auth/me")
  })
})
