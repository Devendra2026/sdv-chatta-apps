import type { ComponentType } from "react"
import {
  ClipboardList,
  FileDown,
  FileUp,
  History,
  LayoutDashboard,
  Receipt,
  Settings,
  Shield,
  Users,
  Wallet,
  BarChart3,
  Banknote,
  RefreshCw,
  ScrollText,
} from "lucide-react"

export type NavItem = {
  title: string
  href?: string
  icon?: ComponentType<{ className?: string }>
  permission?: string | string[]
  children?: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:read",
  },
  {
    title: "Survey",
    href: "/surveys",
    icon: ClipboardList,
    permission: "survey:read",
  },
  {
    title: "Reports",
    icon: BarChart3,
    permission: "report:read",
    children: [
      { title: "Report Builder", href: "/reports", permission: "report:read" },
      { title: "Tax Rates", href: "/reports/tax-rates", permission: "report:read" },
      { title: "Demand Notice", href: "/reports/notice", permission: "report:read" },
    ],
  },
  {
    title: "Payments",
    icon: Wallet,
    permission: "payment:read",
    children: [
      { title: "All Payments", href: "/payments", permission: "payment:read" },
      {
        title: "Offline Collection",
        href: "/payments/offline",
        permission: "payment:offline:create",
        icon: Banknote,
      },
      { title: "Online Transactions", href: "/payments/online", permission: "payment:read" },
      { title: "Failed Payments", href: "/payments/failed", permission: "payment:read" },
      { title: "Refunds", href: "/payments/refunds", permission: "refund:read", icon: RefreshCw },
      { title: "Settlements", href: "/payments/settlements", permission: "settlement:read", icon: Receipt },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    permission: ["user:read", "role:read", "permission:read", "settings:update"],
    children: [
      { title: "Users", href: "/settings/users", permission: "user:read", icon: Users },
      { title: "Roles", href: "/settings/roles", permission: "role:read", icon: Shield },
      { title: "Permissions", href: "/settings/permissions", permission: "permission:read" },
      { title: "Audit Logs", href: "/audit-logs", permission: "audit:read", icon: ScrollText },
      { title: "System Settings", href: "/settings/system", permission: "settings:update" },
    ],
  },
  {
    title: "Import / Export",
    icon: FileUp,
    permission: ["import:read", "import:create", "export:create"],
    children: [
      { title: "Import", href: "/surveys/import", permission: "import:create", icon: FileUp },
      { title: "Export", href: "/surveys/export", permission: "export:create", icon: FileDown },
      { title: "History", href: "/surveys/import/history", permission: "import:read", icon: History },
    ],
  },
]

/** True when Survey list/detail is active, but not import/export routes. */
export function isSurveyNavActive(pathname: string): boolean {
  if (pathname === "/surveys") return true
  if (!pathname.startsWith("/surveys/")) return false
  if (pathname.startsWith("/surveys/import") || pathname.startsWith("/surveys/export")) {
    return false
  }
  return true
}

export function getBreadcrumbLabel(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard"
  if (isSurveyNavActive(pathname)) return "Survey"
  if (pathname.startsWith("/reports")) return "Reports"
  if (pathname.startsWith("/payments")) return "Payments"
  if (pathname.startsWith("/settings") || pathname.startsWith("/audit-logs")) {
    return "Settings"
  }
  if (
    pathname.startsWith("/surveys/import") ||
    pathname.startsWith("/surveys/export")
  ) {
    return "Import / Export"
  }
  return "Admin Portal"
}
