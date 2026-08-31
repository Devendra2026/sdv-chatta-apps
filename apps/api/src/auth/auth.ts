import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP } from "better-auth/plugins"

import { resolveSeedAdminEmail } from "../db/seed-admin-config"
import { PrismaService } from "../prisma/prisma.service"
import {
  advancedAuth,
  emailPasswordInviteOnly,
  googleAccountLinking,
  resolveGoogleSocialProvider,
  resolvePublicAppUrl,
  resolveTrustedOrigins,
} from "./auth-options"
import { sendOtpEmail } from "./send-otp-email"

type BetterAuthInstance = ReturnType<typeof betterAuth>

export function createAuth(prisma: PrismaService): BetterAuthInstance {
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
    advanced: advancedAuth,
    plugins: [
      emailOTP({
        disableSignUp: true,
        otpLength: 6,
        expiresIn: 300,
        storeOTP: "hashed",
        allowedAttempts: 5,
        async sendVerificationOTP({ email, otp, type }) {
          await sendOtpEmail({ email, otp, type })
        },
      }),
    ],
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
            const adminEmail = resolveSeedAdminEmail()

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
  }) as unknown as BetterAuthInstance
}

export type Auth = BetterAuthInstance
