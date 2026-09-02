import { NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"

import { AuditService } from "../audit/audit.service"
import { SessionService } from "../auth/session.service"
import { PrismaService } from "../prisma/prisma.service"
import { UsersService } from "./users.service"

describe("UsersService", () => {
  const prisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    role: { findMany: jest.fn(), findUnique: jest.fn() },
    userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
  }

  const sessionService = {
    revokeAllUserSessions: jest.fn(),
  }

  const audit = {
    log: jest.fn(),
  }

  let service: UsersService

  beforeEach(async () => {
    jest.clearAllMocks()
    prisma.user.count.mockReset()
    prisma.user.findMany.mockReset()
    prisma.user.findUnique.mockReset()
    prisma.user.findUniqueOrThrow.mockReset()
    prisma.user.update.mockReset()
    prisma.$transaction.mockReset()
    prisma.role.findMany.mockReset()
    prisma.role.findUnique.mockReset()
    prisma.userRole.deleteMany.mockReset()
    prisma.userRole.createMany.mockReset()
    sessionService.revokeAllUserSessions.mockReset()
    audit.log.mockReset()
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SessionService, useValue: sessionService },
        { provide: AuditService, useValue: audit },
      ],
    }).compile()

    service = moduleRef.get(UsersService)
  })

  it("omits passwordHash from list results", async () => {
    prisma.user.count.mockResolvedValue(1)
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "secret",
        userRoles: [{ role: { id: "r1", code: "CLERK", name: "Clerk" } }],
      },
    ])
    prisma.$transaction.mockImplementation(async (ops) => {
      if (Array.isArray(ops)) {
        const results = []
        for (const op of ops) results.push(await op)
        return results
      }
      return ops(prisma)
    })

    const { items } = await service.list(1, 20)
    expect(items[0]).not.toHaveProperty("passwordHash")
    expect(items[0]?.roles[0]?.code).toBe("CLERK")
  })

  it("revokes sessions when suspending a user", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "u2",
        status: "ACTIVE",
        userRoles: [],
      })
      .mockResolvedValueOnce({
        id: "u2",
        status: "ACTIVE",
        userRoles: [],
      })
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "u2",
      email: "x@y.com",
      name: "X",
      status: "SUSPENDED",
      userRoles: [],
    })
    prisma.user.update.mockResolvedValue({})

    await service.update(
      "u2",
      { status: "SUSPENDED" },
      {
        id: "admin",
        email: "admin@example.com",
        name: "Admin",
        status: "ACTIVE",
        roles: ["SUPER_ADMIN"],
        permissions: [],
      }
    )

    expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith("u2")
  })

  it("revokes sessions when roles change", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "u4",
        status: "ACTIVE",
        userRoles: [{ roleId: "r1", role: { id: "r1", code: "OPERATOR" } }],
      })
      .mockResolvedValueOnce({
        id: "u4",
        status: "ACTIVE",
        userRoles: [{ roleId: "r1", role: { id: "r1", code: "OPERATOR" } }],
      })
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "u4",
      email: "x@y.com",
      name: "X",
      status: "ACTIVE",
      userRoles: [{ roleId: "r2", role: { id: "r2", code: "CLERK" } }],
    })
    prisma.user.update.mockResolvedValue({})
    prisma.role.findMany.mockResolvedValue([
      { id: "r2", code: "CLERK", name: "Clerk" },
    ])

    await service.update(
      "u4",
      { roleIds: ["r2"] },
      {
        id: "admin",
        email: "admin@example.com",
        name: "Admin",
        status: "ACTIVE",
        roles: ["SUPER_ADMIN"],
        permissions: [],
      }
    )

    expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith("u4")
  })

  it("deactivate sets INACTIVE and revokes sessions", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u3",
      status: "ACTIVE",
      userRoles: [],
    })
    prisma.user.update.mockResolvedValue({
      id: "u3",
      email: "z@y.com",
      name: "Z",
      status: "INACTIVE",
      userRoles: [],
    })

    const result = await service.deactivate("u3", {
      id: "admin",
      email: "admin@example.com",
      name: "Admin",
      status: "ACTIVE",
      roles: ["SUPER_ADMIN"],
      permissions: [],
    })

    expect(result.status).toBe("INACTIVE")
    expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith("u3")
  })

  it("deactivate throws when user is missing", async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(
      service.deactivate("missing", {
        id: "admin",
        email: "admin@example.com",
        name: "Admin",
        status: "ACTIVE",
        roles: ["SUPER_ADMIN"],
        permissions: [],
      })
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
