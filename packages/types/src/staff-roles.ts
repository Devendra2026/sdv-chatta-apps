/** Canonical staff portal role codes (Better Auth + RBAC). */
export const STAFF_ROLE_CODES = [
  "SUPER_ADMIN",
  "DEPARTMENT_ADMIN",
  "CLERK",
  "OPERATOR",
] as const

export type StaffRoleCode = (typeof STAFF_ROLE_CODES)[number]

export function isStaffRoleCode(code: string): code is StaffRoleCode {
  return (STAFF_ROLE_CODES as readonly string[]).includes(code)
}

/** Roles a SUPER_ADMIN may assign when provisioning staff. */
export const ASSIGNABLE_STAFF_ROLE_CODES = [
  "SUPER_ADMIN",
  "DEPARTMENT_ADMIN",
  "CLERK",
  "OPERATOR",
] as const

export type AssignableStaffRoleCode =
  (typeof ASSIGNABLE_STAFF_ROLE_CODES)[number]
