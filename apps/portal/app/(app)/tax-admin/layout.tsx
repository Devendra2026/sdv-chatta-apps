"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { label: "Tax Rates", href: "/tax-admin/tax-rates" },
  { label: "Assessment Years", href: "/tax-admin/assessment-years" },
  { label: "Property Rebates", href: "/tax-admin/property-tax-rebates" },
  { label: "Water Rebates", href: "/tax-admin/water-tax-rebates" },
  { label: "Property Penalties", href: "/tax-admin/property-tax-penalties" },
  { label: "Water Penalties", href: "/tax-admin/water-tax-penalties" },
] as const

export default function TaxAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-rose-700">
          TAX ADMINISTRATION
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Tax Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage assessment years, published rates, rebates, and penalties.
        </p>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
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
