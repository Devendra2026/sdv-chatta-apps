"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { api, type AuthSessionItem } from "@/lib/api"
import { SettingsPageHeader } from "../_components/settings-page-header"

export default function ProfileSettingsPage() {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sessions, setSessions] = React.useState<AuthSessionItem[]>([])
  const [sessionsLoading, setSessionsLoading] = React.useState(true)

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ sessions: AuthSessionItem[] }>(
          "/api/v1/auth/sessions"
        )
        setSessions(res.data.sessions)
      } catch {
        toast.error("Could not load active sessions")
      } finally {
        setSessionsLoading(false)
      }
    })()
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters")
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

  async function revokeSession(id: string) {
    try {
      await api.delete(`/api/v1/auth/sessions/${id}`)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      toast.success("Session revoked")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke session")
    }
  }

  async function revokeAllOthers() {
    try {
      await api.post("/api/v1/auth/sessions/revoke-all", { keepCurrent: true })
      setSessions((prev) => prev.filter((s) => s.current))
      toast.success("Other sessions signed out")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke sessions")
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <SettingsPageHeader
        title="Profile"
        description="Update your password and manage active sign-in sessions."
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
          <Label htmlFor="new-password">New password (min 12 characters)</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={12}
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
            minLength={12}
            className="h-10"
          />
        </div>
        <Button type="submit" className="cursor-pointer" disabled={loading}>
          {loading ? "Saving…" : "Change password"}
        </Button>
      </form>

      <section className="space-y-3 rounded-xl border bg-card p-6 shadow-[var(--shadow-premium)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">Active sessions</h2>
            <p className="text-sm text-muted-foreground">
              Devices where you are signed in to the staff portal.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer shrink-0"
            disabled={sessionsLoading || sessions.filter((s) => !s.current).length === 0}
            onClick={() => void revokeAllOthers()}
          >
            Sign out others
          </Button>
        </div>
        {sessionsLoading ? (
          <p className="text-sm text-muted-foreground">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-start justify-between gap-3 px-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {session.current ? "This device" : "Other device"}
                    {session.current ? (
                      <span className="ml-2 text-xs font-normal text-emerald-700">
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {session.userAgent ?? "Unknown browser"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active{" "}
                    {new Date(session.lastActiveAt).toLocaleString()}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                  </p>
                </div>
                {!session.current ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer shrink-0"
                    onClick={() => void revokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
