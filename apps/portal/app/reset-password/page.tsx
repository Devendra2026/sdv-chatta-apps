"use client"

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import { Suspense } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { api } from "@/lib/api"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get("token") ?? ""

  const [email, setEmail] = React.useState("")
  const [token, setToken] = React.useState(tokenFromUrl)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl)
  }, [tokenFromUrl])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters")
      return
    }
    if (!token.trim()) {
      toast.error("Reset link is invalid or missing")
      return
    }

    setLoading(true)
    try {
      await api.post("/api/v1/auth/reset-password", {
        email: email.trim(),
        token: token.trim(),
        newPassword,
      })
      toast.success("Password updated. Sign in with your new password.")
      window.location.assign("/login")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password reset failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-slate-50">
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <Image
              src="/branding/up-government-logo.png"
              alt="Uttar Pradesh Government emblem"
              width={44}
              height={44}
              className="size-10 object-contain p-0.5"
              priority
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Set new password / नया पासवर्ड
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter your email and choose a new password (minimum 12 characters).
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email / ईमेल</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            {!tokenFromUrl ? (
              <div className="space-y-2">
                <Label htmlFor="reset-token">Reset token (from email link)</Label>
                <Input
                  id="reset-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="h-10 font-mono text-sm"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="reset-new">New password</Label>
              <Input
                id="reset-new"
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
              <Label htmlFor="reset-confirm">Confirm password</Label>
              <Input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full cursor-pointer bg-sky-800 transition-colors duration-200 hover:bg-sky-900"
              disabled={loading}
            >
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link
              href="/login"
              className="cursor-pointer font-medium text-sky-800 transition-colors duration-200 hover:text-sky-950 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-slate-50 text-sm text-slate-600">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
