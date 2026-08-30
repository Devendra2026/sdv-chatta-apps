"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

import { usePermission } from "@/hooks/use-permission"

type SettingsTab = {
  label: string
  href: string
  match: (p: string) => boolean
  alwaysVisible?: boolean
  permission?: string
}

export const SETTINGS_TABS: SettingsTab[] = [
  {
    label: "Profile",
    href: "/settings/profile",
    match: (p) => p.startsWith("/settings/profile"),
    alwaysVisible: true,
  },
  {
    label: "Users",
    href: "/settings/users",
    match: (p) => p.startsWith("/settings/users"),
    permission: "user:read",
  },
  {
    label: "Roles",
    href: "/settings/roles",
    match: (p) => p.startsWith("/settings/roles"),
    permission: "role:read",
  },
  {
    label: "Permissions",
    href: "/settings/permissions",
    match: (p) => p.startsWith("/settings/permissions"),
    permission: "permission:read",
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    match: (p) => p.startsWith("/audit-logs"),
    permission: "audit:read",
  },
  {
    label: "System Settings",
    href: "/settings/system",
    match: (p) => p.startsWith("/settings/system"),
    permission: "settings:update",
  },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const { can } = usePermission()

  const visibleTabs = SETTINGS_TABS.filter(
    (tab) => tab.alwaysVisible || (tab.permission ? can(tab.permission) : true)
  )

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b"
      aria-label="Settings sections"
    >
      {visibleTabs.map((tab) => {
        const isActive = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "cursor-pointer border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
