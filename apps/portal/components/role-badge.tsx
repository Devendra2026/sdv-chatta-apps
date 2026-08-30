"use client"

import { Shield } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { usePermission } from "@/hooks/use-permission"
import {
  isStaffRoleCode,
  STAFF_ROLE_META,
  type StaffRoleCode,
} from "@/lib/staff-roles"

function accessLabel(roles?: string[]): string {
  if (!roles?.length) return "Limited access"
  for (const code of roles) {
    if (isStaffRoleCode(code)) return STAFF_ROLE_META[code].access
  }
  return "Scoped access"
}

function roleBadge(roles?: string[]): string {
  if (!roles?.length) return "USER"
  const priority: StaffRoleCode[] = [
    "SUPER_ADMIN",
    "DEPARTMENT_ADMIN",
    "CLERK",
    "OPERATOR",
  ]
  for (const code of priority) {
    if (roles.includes(code)) return STAFF_ROLE_META[code].name.toUpperCase()
  }
  return roles[0]!.replace(/_/g, " ")
}

export function RoleBadge() {
  const { user, isLoading } = usePermission()

  if (isLoading) {
    return <Skeleton className="hidden h-8 w-44 rounded-full lg:block" />
  }

  const role = roleBadge(user?.roles)
  const access = accessLabel(user?.roles)

  return (
    <div
      className="hidden max-w-[16rem] items-center gap-1.5 truncate rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-800 lg:inline-flex dark:bg-emerald-500/15 dark:text-emerald-300"
      title={`${role} · ${access}`}
    >
      <Shield className="size-3.5 shrink-0 opacity-80" />
      <span className="truncate">
        <span className="font-semibold tracking-wide">{role}</span>
        <span className="mx-1 opacity-50">|</span>
        <span>{access}</span>
      </span>
    </div>
  )
}
