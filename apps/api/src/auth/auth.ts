import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { PrismaService } from "../prisma/prisma.service"

export function createAuth(prisma: PrismaService) {
  const publicAppUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.PUBLIC_APP_URL ??
    "http://localhost:3000"

  const trustedOrigins = (
    process.env.CORS_ORIGIN ??
    "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)

  return betterAuth({
    appName: "Nagar Panchayat Chhata",
    baseURL: publicAppUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins,
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
        },
        status: {
          type: "string",
          required: false,
          defaultValue: "ACTIVE",
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const adminEmail = (
              process.env.SEED_ADMIN_EMAIL ?? "sikarwar2010@gmail.com"
            ).toLowerCase()

            const hasSuperAdmin = await prisma.userRole.findFirst({
              where: { role: { code: "SUPER_ADMIN" } },
            })

            const roleCode =
              user.email.toLowerCase() === adminEmail || !hasSuperAdmin
                ? "SUPER_ADMIN"
                : "SURVEYOR"

            const role = await prisma.role.findUnique({
              where: { code: roleCode },
            })
            if (!role) return

            await prisma.userRole.upsert({
              where: {
                userId_roleId: {
                  userId: user.id,
                  roleId: role.id,
                },
              },
              update: {},
              create: {
                userId: user.id,
                roleId: role.id,
              },
            })
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
