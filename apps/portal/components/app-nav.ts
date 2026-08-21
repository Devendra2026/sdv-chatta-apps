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
    icon: ClipboardList,
    permission: "survey:read",
    children: [
      { title: "Survey List", href: "/surveys", permission: "survey:read" },
      { title: "Import Data", href: "/surveys/import", permission: "import:create" },
      { title: "Export Data", href: "/surveys/export", permission: "export:create" },
      { title: "Import History", href: "/surveys/import/history", permission: "import:read" },
    ],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    permission: "report:read",
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
    permission: "import:read",
    children: [
      { title: "Import", href: "/surveys/import", permission: "import:create", icon: FileUp },
      { title: "Export", href: "/surveys/export", permission: "export:create", icon: FileDown },
      { title: "History", href: "/surveys/import/history", permission: "import:read", icon: History },
    ],
  },
]
