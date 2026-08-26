"use client"

import { SettingsSectionShell } from "./_components/settings-section-shell"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SettingsSectionShell>{children}</SettingsSectionShell>
}
