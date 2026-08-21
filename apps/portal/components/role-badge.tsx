"use client"

import { Shield } from "lucide-react"

import { usePermission } from "@/hooks/use-permission"
import { Skeleton } from "@workspace/ui/components/skeleton"

function accessLabel(roles?: string[]): string {
  if (!roles?.length) return "Limited access"
  if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) {
    return "Full access"
  }
  return "Scoped access"
}

function roleBadge(roles?: string[]): string {
  if (!roles?.length) return "USER"
  if (roles.includes("SUPER_ADMIN")) return "SUPER ADMIN"
  if (roles.includes("ADMIN")) return "ADMIN"
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
      className="bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 hidden max-w-[16rem] items-center gap-1.5 truncate rounded-full px-3 py-1.5 text-xs font-medium lg:inline-flex"
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
