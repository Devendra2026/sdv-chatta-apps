import type { LucideIcon } from "lucide-react"
import { ClipboardPen, HardHat, Shield, ShieldCheck } from "lucide-react"

/** Canonical staff roles for Chhata portal (UI + assignment). */
export const STAFF_ROLE_CODES = [
  "SUPER_ADMIN",
  "ADMIN",
  "CLERK",
  "OPERATOR",
] as const

export type StaffRoleCode = (typeof STAFF_ROLE_CODES)[number]

export const STAFF_ROLE_META: Record<
  StaffRoleCode,
  {
    name: string
    summary: string
    access: string
    icon: LucideIcon
    accent: string
  }
> = {
  SUPER_ADMIN: {
    name: "Super Admin",
    summary: "Full system access — users, roles, settings, and all modules.",
    access: "Full access",
    icon: ShieldCheck,
    accent: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  ADMIN: {
    name: "Admin",
    summary: "Municipal administrator with full operational control.",
    access: "Full access",
    icon: Shield,
    accent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  CLERK: {
    name: "Clerk",
    summary:
      "Office clerk — surveys, imports, reports, and counter collections.",
    access: "Scoped access",
    icon: ClipboardPen,
    accent: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
  },
  OPERATOR: {
    name: "Operator",
    summary: "Field / ops staff — surveys and offline payment collection.",
    access: "Scoped access",
    icon: HardHat,
    accent: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
}

export function isStaffRoleCode(code: string): code is StaffRoleCode {
  return (STAFF_ROLE_CODES as readonly string[]).includes(code)
}

export function staffRoleOrder(code: string): number {
  const idx = (STAFF_ROLE_CODES as readonly string[]).indexOf(code)
  return idx === -1 ? 999 : idx
}

export function filterStaffRoles<T extends { code: string }>(roles: T[]): T[] {
  return [...roles]
    .filter((r) => isStaffRoleCode(r.code))
    .sort((a, b) => staffRoleOrder(a.code) - staffRoleOrder(b.code))
}
