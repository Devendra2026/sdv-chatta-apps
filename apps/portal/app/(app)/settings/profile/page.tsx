"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { api } from "@/lib/api"
import { SettingsPageHeader } from "../_components/settings-page-header"

export default function ProfileSettingsPage() {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      await api.patch("/api/v1/auth/me/password", {
        currentPassword,
        newPassword,
      })
      toast.success("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not change password"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <SettingsPageHeader
        title="Profile"
        description="Update your account password. All staff roles can change their own password here."
      />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border bg-card p-6 shadow-[var(--shadow-premium)]"
      >
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="h-10"
          />
        </div>
        <Button type="submit" className="cursor-pointer" disabled={loading}>
          {loading ? "Saving…" : "Change password"}
        </Button>
      </form>
    </div>
  )
}
