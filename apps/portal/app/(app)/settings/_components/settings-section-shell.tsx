"use client"

import { SettingsTabs } from "./settings-tabs"

export function SettingsSectionShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-primary">
          ACCESS &amp; ADMINISTRATION
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage staff accounts, roles, permissions, audit history, and system
          configuration.
        </p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  )
}
