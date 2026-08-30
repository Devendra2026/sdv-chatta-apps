import type { PrismaClient } from "@prisma/client"
import { verifyPassword } from "better-auth/crypto"

import { CREDENTIAL_ISSUER, CREDENTIAL_PROVIDER_ID } from "./credential"
import { seedDatabase } from "./seed-database"

jest.mock("better-auth/crypto", () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
  verifyPassword: async ({
    hash,
    password,
  }: {
    hash: string
    password: string
  }) => hash === `hashed:${password}`,
}))

function createPrismaMock() {
  const users = new Map<string, { id: string; email: string; name: string }>()
  const accounts: Array<{
    id: string
    userId: string
    providerId: string
    issuer: string
    password: string
    accountId: string
  }> = []
  const userRoles: Array<{ userId: string; roleId: string }> = []
  const permissions = [
    { id: "perm-1", code: "dashboard:read" },
    { id: "perm-2", code: "user:read" },
  ]
  const roles = new Map<string, { id: string; code: string }>([
    ["SUPER_ADMIN", { id: "role-super", code: "SUPER_ADMIN" }],
    ["DEPARTMENT_ADMIN", { id: "role-dept", code: "DEPARTMENT_ADMIN" }],
    ["CLERK", { id: "role-clerk", code: "CLERK" }],
    ["OPERATOR", { id: "role-operator", code: "OPERATOR" }],
  ])

  const prisma = {
    ward: {
      upsert: jest.fn(async () => ({})),
    },
    referenceCategory: {
      upsert: jest.fn(async ({ where }: { where: { code: string } }) => ({
        id: `cat-${where.code}`,
      })),
    },
    referenceEntry: {
      upsert: jest.fn(async () => ({})),
    },
    permission: {
      upsert: jest.fn(async () => ({})),
      findMany: jest.fn(async () => permissions),
    },
    role: {
      upsert: jest.fn(async ({ where }: { where: { code: string } }) =>
        roles.get(where.code)
      ),
      findUniqueOrThrow: jest.fn(
        async ({ where }: { where: { code: string } }) => {
          const role = roles.get(where.code)
          if (!role) throw new Error("missing role")
          return role
        }
      ),
    },
    rolePermission: {
      upsert: jest.fn(async () => ({})),
    },
    user: {
      findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
        return users.get(where.email) ?? null
      }),
      upsert: jest.fn(
        async ({
          where,
          create,
        }: {
          where: { email: string }
          create: { email: string; name: string }
        }) => {
          const existing = users.get(where.email)
          if (existing) return existing
          const created = { id: `user-${users.size + 1}`, ...create }
          users.set(create.email, created)
          return created
        }
      ),
    },
    userRole: {
      upsert: jest.fn(
        async ({ create }: { create: { userId: string; roleId: string } }) => {
          userRoles.push(create)
          return create
        }
      ),
    },
    account: {
      findFirst: jest.fn(
        async ({ where }: { where: { userId: string; providerId: string } }) =>
          accounts.find(
            (a) =>
              a.userId === where.userId && a.providerId === where.providerId
          ) ?? null
      ),
      create: jest.fn(async ({ data }: { data: (typeof accounts)[number] }) => {
        const row = { ...data, id: `acct-${accounts.length + 1}` }
        accounts.push(row)
        return row
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string }
          data: Partial<(typeof accounts)[number]>
        }) => {
          const row = accounts.find((a) => a.id === where.id)
          if (!row) throw new Error("missing account")
          Object.assign(row, data)
          return row
        }
      ),
    },
  }

  return {
    prisma: prisma as unknown as PrismaClient,
    users,
    accounts,
    userRoles,
  }
}

const seedEnv = {
  NODE_ENV: "test",
  SEED_ADMIN_EMAIL: "admin@example.com",
  SEED_ADMIN_NAME: "Super Admin",
  SEED_ADMIN_PASSWORD: "strong-pass-1",
}

describe("seedDatabase", () => {
  it("creates a Super Admin with hashed credential account", async () => {
    const { prisma, users, accounts, userRoles } = createPrismaMock()
    const logs: string[] = []

    await seedDatabase(prisma, {
      env: seedEnv,
      hashPassword: async (password) => `hashed:${password}`,
      logger: { info: (m) => logs.push(m) },
    })

    expect(users.size).toBe(1)
    expect(users.get("admin@example.com")?.email).toBe("admin@example.com")
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.providerId).toBe(CREDENTIAL_PROVIDER_ID)
    expect(accounts[0]?.issuer).toBe(CREDENTIAL_ISSUER)
    expect(accounts[0]?.password).toBe("hashed:strong-pass-1")
    expect(userRoles).toEqual([{ userId: "user-1", roleId: "role-super" }])
    expect(logs.some((l) => l.includes("Seeding Super Admin"))).toBe(true)
    expect(logs.join("\n")).not.toMatch(/strong-pass-1/)
    expect(logs.join("\n")).not.toMatch(/hashed:/)
  })

  it("is idempotent and does not create a second Super Admin", async () => {
    const { prisma, users, accounts } = createPrismaMock()

    await seedDatabase(prisma, {
      env: seedEnv,
      hashPassword: async (password) => `hashed:${password}`,
      logger: { info: () => undefined },
    })
    await seedDatabase(prisma, {
      env: seedEnv,
      hashPassword: async (password) => `hashed:${password}-2`,
      logger: { info: () => undefined },
    })

    expect(users.size).toBe(1)
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.password).toBe("hashed:strong-pass-1-2")
    expect((prisma.user.upsert as jest.Mock).mock.calls).toHaveLength(2)
    expect((prisma.account.create as jest.Mock).mock.calls).toHaveLength(1)
    expect((prisma.account.update as jest.Mock).mock.calls).toHaveLength(1)
  })

  it("stores a hash that the Better Auth verifyPassword contract accepts", async () => {
    const { prisma, accounts } = createPrismaMock()

    await seedDatabase(prisma, {
      env: seedEnv,
      logger: { info: () => undefined },
    })

    expect(accounts[0]?.password).toBe("hashed:strong-pass-1")
    expect(
      await verifyPassword({
        hash: accounts[0]!.password,
        password: seedEnv.SEED_ADMIN_PASSWORD,
      })
    ).toBe(true)
  })
})
