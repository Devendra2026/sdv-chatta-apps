import type { PrismaClient } from "@prisma/client"
import { hashPassword as defaultHashPassword } from "better-auth/crypto"

import { CREDENTIAL_ISSUER, CREDENTIAL_PROVIDER_ID } from "./credential"
import { seedReferenceCatalogs } from "./reference-catalogs-seed"
import { resolveSeedAdminConfig } from "./seed-admin-config"

export type SeedLogger = {
  info: (message: string) => void
}

export type SeedOptions = {
  env?: NodeJS.ProcessEnv
  hashPassword?: (password: string) => Promise<string>
  logger?: SeedLogger
}

const defaultLogger: SeedLogger = {
  info: (message) => console.log(`[seed] ${message}`),
}

const WARDS = [
  { number: 1, code: "W01", name: "वार्ड नंबर 1 - जाटव जाटान" },
  { number: 2, code: "W02", name: "वार्ड नंबर 2 - शेरगढ रोड़" },
  { number: 3, code: "W03", name: "वार्ड नंबर 3 - चन्दूपुरा, कठमालिया" },
  { number: 4, code: "W04", name: "वार्ड नंबर 4 - शिव कॉलौनी" },
  { number: 5, code: "W05", name: "वार्ड नंबर 5 - आवकारी" },
  { number: 6, code: "W06", name: "वार्ड नंबर 6 - सींगू थोक" },
  { number: 7, code: "W07", name: "वार्ड नंबर 7 - नगला थोक" },
  { number: 8, code: "W08", name: "वार्ड नंबर 8 - सरायशाही" },
  { number: 9, code: "W09", name: "वार्ड नंबर 9 - चतुर्भजी" },
  { number: 10, code: "W10", name: "वार्ड नंबर 10 - कसाईपाडा" },
  { number: 11, code: "W11", name: "वार्ड नंबर 11 - हरनाथिया, राहमनपाडा" },
  { number: 12, code: "W12", name: "वार्ड नंबर 12 - हमीर थोक" },
  { number: 13, code: "W13", name: "वार्ड नंबर 13 - तेलीपाडा" },
  { number: 14, code: "W14", name: "वार्ड नंबर 14 - बनियापाडा, सत्यनारायण" },
  { number: 15, code: "W15", name: "वार्ड नंबर 15 - बीच का थोक" },
] as const

const PERMISSIONS: Array<{
  code: string
  resource: string
  action: string
  description: string
}> = [
  {
    code: "dashboard:read",
    resource: "dashboard",
    action: "read",
    description: "View dashboard",
  },
  {
    code: "survey:read",
    resource: "survey",
    action: "read",
    description: "View surveys",
  },
  {
    code: "survey:create",
    resource: "survey",
    action: "create",
    description: "Create surveys",
  },
  {
    code: "survey:update",
    resource: "survey",
    action: "update",
    description: "Update surveys",
  },
  {
    code: "survey:delete",
    resource: "survey",
    action: "delete",
    description: "Delete surveys",
  },
  {
    code: "survey:pii:read",
    resource: "survey:pii",
    action: "read",
    description: "View survey PII",
  },
  {
    code: "import:read",
    resource: "import",
    action: "read",
    description: "View imports",
  },
  {
    code: "import:create",
    resource: "import",
    action: "create",
    description: "Run imports",
  },
  {
    code: "export:create",
    resource: "export",
    action: "create",
    description: "Export data",
  },
  {
    code: "export:read",
    resource: "export",
    action: "read",
    description: "View exports",
  },
  {
    code: "report:read",
    resource: "report",
    action: "read",
    description: "View reports",
  },
  {
    code: "report:export",
    resource: "report",
    action: "export",
    description: "Export reports",
  },
  {
    code: "payment:read",
    resource: "payment",
    action: "read",
    description: "View payments",
  },
  {
    code: "payment:create",
    resource: "payment",
    action: "create",
    description: "Create payments",
  },
  {
    code: "payment:update",
    resource: "payment",
    action: "update",
    description: "Update payments",
  },
  {
    code: "payment:offline:create",
    resource: "payment:offline",
    action: "create",
    description: "Offline collection",
  },
  {
    code: "payment:requery",
    resource: "payment",
    action: "requery",
    description: "Requery payments",
  },
  {
    code: "refund:create",
    resource: "refund",
    action: "create",
    description: "Create refunds",
  },
  {
    code: "refund:read",
    resource: "refund",
    action: "read",
    description: "View refunds",
  },
  {
    code: "settlement:read",
    resource: "settlement",
    action: "read",
    description: "View settlements",
  },
  {
    code: "user:read",
    resource: "user",
    action: "read",
    description: "View users",
  },
  {
    code: "user:create",
    resource: "user",
    action: "create",
    description: "Create users",
  },
  {
    code: "user:update",
    resource: "user",
    action: "update",
    description: "Update users",
  },
  {
    code: "user:delete",
    resource: "user",
    action: "delete",
    description: "Deactivate users",
  },
  {
    code: "role:read",
    resource: "role",
    action: "read",
    description: "View roles",
  },
  {
    code: "role:create",
    resource: "role",
    action: "create",
    description: "Create roles",
  },
  {
    code: "role:update",
    resource: "role",
    action: "update",
    description: "Update roles",
  },
  {
    code: "role:delete",
    resource: "role",
    action: "delete",
    description: "Delete roles",
  },
  {
    code: "permission:read",
    resource: "permission",
    action: "read",
    description: "View permissions",
  },
  {
    code: "settings:update",
    resource: "settings",
    action: "update",
    description: "Update settings",
  },
  {
    code: "audit:read",
    resource: "audit",
    action: "read",
    description: "View audit logs",
  },
  {
    code: "file:read",
    resource: "file",
    action: "read",
    description: "View files",
  },
  {
    code: "file:create",
    resource: "file",
    action: "create",
    description: "Upload files",
  },
]

const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  SUPER_ADMIN: "*",
  ADMIN: "*",
  CLERK: [
    "dashboard:read",
    "survey:read",
    "survey:create",
    "survey:update",
    "survey:pii:read",
    "import:read",
    "import:create",
    "export:read",
    "export:create",
    "report:read",
    "report:export",
    "payment:read",
    "payment:offline:create",
    "payment:requery",
    "refund:read",
    "settlement:read",
    "file:read",
    "file:create",
  ],
  OPERATOR: [
    "dashboard:read",
    "survey:read",
    "survey:create",
    "survey:update",
    "payment:read",
    "payment:offline:create",
    "file:read",
    "file:create",
    "report:read",
  ],
}

const ROLES = [
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full system access — users, roles, settings, and all modules",
    isSystem: true,
  },
  {
    code: "ADMIN",
    name: "Admin",
    description: "Municipal administrator with full operational access",
    isSystem: true,
  },
  {
    code: "CLERK",
    name: "Clerk",
    description:
      "Office clerk — surveys, imports, reports, and counter collections",
    isSystem: true,
  },
  {
    code: "OPERATOR",
    name: "Operator",
    description: "Field / ops staff — surveys and offline payment collection",
    isSystem: true,
  },
]

export async function seedDatabase(
  prisma: PrismaClient,
  options: SeedOptions = {}
) {
  const env = options.env ?? process.env
  const hashPassword = options.hashPassword ?? defaultHashPassword
  const logger = options.logger ?? defaultLogger
  const adminConfig = resolveSeedAdminConfig(env)

  logger.info("Seeding reference data...")

  for (const ward of WARDS) {
    await prisma.ward.upsert({
      where: { number: ward.number },
      update: { code: ward.code, name: ward.name, isActive: true },
      create: { ...ward, isActive: true },
    })
  }

  await seedReferenceCatalogs(prisma)

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    })
  }

  const allPermissions = await prisma.permission.findMany()
  const permissionByCode = new Map(
    allPermissions.map((p: { code: string }) => [p.code, p])
  )

  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: role,
    })

    const codes = ROLE_PERMISSIONS[role.code]
    const selected =
      codes === "*"
        ? allPermissions
        : (codes ?? [])
            .map((code) => permissionByCode.get(code))
            .filter((p): p is (typeof allPermissions)[number] => Boolean(p))

    for (const permission of selected) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: saved.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: saved.id,
          permissionId: permission.id,
        },
      })
    }
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminConfig.email },
  })

  if (existingAdmin) {
    logger.info("Super Admin already exists; updating required seed fields...")
  } else {
    logger.info("Seeding Super Admin...")
  }

  const admin = await prisma.user.upsert({
    where: { email: adminConfig.email },
    update: {
      name: adminConfig.name,
      emailVerified: true,
      status: "ACTIVE",
    },
    create: {
      email: adminConfig.email,
      name: adminConfig.name,
      emailVerified: true,
      status: "ACTIVE",
    },
  })

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SUPER_ADMIN" },
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id,
    },
  })

  const hashed = await hashPassword(adminConfig.password)

  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: admin.id,
      providerId: CREDENTIAL_PROVIDER_ID,
    },
  })

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        accountId: admin.id,
        providerId: CREDENTIAL_PROVIDER_ID,
        issuer: CREDENTIAL_ISSUER,
        userId: admin.id,
        password: hashed,
      },
    })
  } else {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        accountId: admin.id,
        issuer: CREDENTIAL_ISSUER,
        password: hashed,
      },
    })
  }

  logger.info("Database initialization completed.")
  logger.info(`Super Admin email: ${adminConfig.email}`)
  logger.info(`Wards: ${WARDS.length}`)
  logger.info(`Permissions: ${PERMISSIONS.length}`)
  logger.info(`Roles: ${ROLES.length}`)
}
