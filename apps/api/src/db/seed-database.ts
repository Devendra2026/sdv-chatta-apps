import type { PrismaClient } from "@prisma/client"
import { PERMISSIONS as PERMISSION_CODES } from "@workspace/types"

import { hashPassword } from "../auth/password-hash"
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

/** Human-readable labels for catalog permission codes (@workspace/types). */
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "dashboard:read": "View dashboard",
  "survey:read": "View surveys",
  "survey:create": "Create surveys",
  "survey:update": "Update surveys",
  "survey:delete": "Delete surveys",
  "survey:pii:read": "View survey PII",
  "import:read": "View imports",
  "import:create": "Run imports",
  "export:read": "View exports",
  "export:create": "Export data",
  "report:read": "View reports",
  "report:export": "Export reports",
  "payment:read": "View payments",
  "payment:create": "Create payments",
  "payment:update": "Update payments",
  "payment:offline:create": "Offline collection",
  "payment:requery": "Requery payments",
  "refund:create": "Create refunds",
  "refund:read": "View refunds",
  "settlement:read": "View settlements",
  "user:read": "View users",
  "user:create": "Create users",
  "user:update": "Update users",
  "user:delete": "Deactivate users",
  "role:read": "View roles",
  "role:create": "Create roles",
  "role:update": "Update roles",
  "role:delete": "Delete roles",
  "permission:read": "View permissions",
  "settings:update": "Update settings",
  "audit:read": "View audit logs",
  "file:read": "View files",
  "file:create": "Upload files",
}

function buildPermissionRow(code: string): {
  code: string
  resource: string
  action: string
  description: string
} {
  const colon = code.lastIndexOf(":")
  return {
    code,
    resource: code.slice(0, colon),
    action: code.slice(colon + 1),
    description: PERMISSION_DESCRIPTIONS[code] ?? code,
  }
}

const PERMISSIONS = PERMISSION_CODES.map(buildPermissionRow)

const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  SUPER_ADMIN: "*",
  DEPARTMENT_ADMIN: PERMISSIONS.map((p) => p.code).filter(
    (code) =>
      !code.startsWith("user:") &&
      !["role:create", "role:update", "role:delete"].includes(code)
  ),
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
    code: "DEPARTMENT_ADMIN",
    name: "Department Admin",
    description:
      "Department administrator — operational access; cannot manage users",
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
  const hashPasswordFn = options.hashPassword ?? hashPassword
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
      passwordHash: await hashPasswordFn(adminConfig.password),
    },
    create: {
      email: adminConfig.email,
      name: adminConfig.name,
      emailVerified: true,
      status: "ACTIVE",
      passwordHash: await hashPasswordFn(adminConfig.password),
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

  logger.info("Database initialization completed.")
  logger.info(`Super Admin email: ${adminConfig.email}`)
  logger.info(`Wards: ${WARDS.length}`)
  logger.info(`Permissions: ${PERMISSIONS.length}`)
  logger.info(`Roles: ${ROLES.length}`)
}
