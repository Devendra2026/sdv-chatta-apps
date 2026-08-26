"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

export const SETTINGS_TABS = [
  {
    label: "Users",
    href: "/settings/users",
    match: (p: string) => p.startsWith("/settings/users"),
  },
  {
    label: "Roles",
    href: "/settings/roles",
    match: (p: string) => p.startsWith("/settings/roles"),
  },
  {
    label: "Permissions",
    href: "/settings/permissions",
    match: (p: string) => p.startsWith("/settings/permissions"),
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    match: (p: string) => p.startsWith("/audit-logs"),
  },
  {
    label: "System Settings",
    href: "/settings/system",
    match: (p: string) => p.startsWith("/settings/system"),
  },
] as const

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b"
      aria-label="Settings sections"
    >
      {SETTINGS_TABS.map((tab) => {
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
