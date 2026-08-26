"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { label: "Import", href: "/surveys/import", exact: true },
  { label: "History", href: "/surveys/import/history", exact: false },
] as const

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-primary">
          DATA IMPORT
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import Survey Data
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload the ward Excel file exported from GIS (Ward 1 = 38 columns,
          Ward 2+ = 55 columns with SN/Actions).
        </p>
      </div>

      <nav className="flex gap-1 border-b" aria-label="Import sections">
        {TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
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
