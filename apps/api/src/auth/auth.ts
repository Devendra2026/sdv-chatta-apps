import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { PrismaService } from "../prisma/prisma.service"
import {
  emailPasswordInviteOnly,
  googleAccountLinking,
  resolveGoogleSocialProvider,
  resolvePublicAppUrl,
  resolveTrustedOrigins,
} from "./auth-options"

export function createAuth(prisma: PrismaService) {
  return betterAuth({
    appName: "Nagar Panchayat Chhata",
    baseURL: resolvePublicAppUrl(),
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: emailPasswordInviteOnly,
    account: {
      accountLinking: {
        enabled: googleAccountLinking.enabled,
        trustedProviders: [...googleAccountLinking.trustedProviders],
      },
    },
    socialProviders: resolveGoogleSocialProvider(),
    trustedOrigins: resolveTrustedOrigins(),
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
            // Safety net for any Better Auth-created users (should be rare with disableSignUp).
            // Admin provisioning assigns roles explicitly in UsersController.
            const adminEmail = (
              process.env.SEED_ADMIN_EMAIL ?? "sikarwar2010@gmail.com"
            ).toLowerCase()

            const hasSuperAdmin = await prisma.userRole.findFirst({
              where: { role: { code: "SUPER_ADMIN" } },
            })

            const roleCode =
              user.email.toLowerCase() === adminEmail || !hasSuperAdmin
                ? "SUPER_ADMIN"
                : "OPERATOR"

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
