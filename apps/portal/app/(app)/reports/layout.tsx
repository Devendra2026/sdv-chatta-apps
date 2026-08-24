"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { label: "Report Builder", href: "/reports" },
  { label: "Tax Rates", href: "/reports/tax-rates" },
  { label: "Demand Notice", href: "/reports/notice" },
] as const

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-rose-700">
          REPORTS &amp; ANALYTICS
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Report Builder
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate, save, and export survey, municipality, and surveyor reports.
          PDF, Excel and dashboard exports.
        </p>
      </div>

      <nav className="flex gap-1 border-b">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/reports"
              ? pathname === "/reports"
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150",
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

      {children}
    </div>
  )
}
