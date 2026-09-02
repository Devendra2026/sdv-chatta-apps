"use client"

import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { api } from "@/lib/api"

type Step = "email" | "reset"

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState<Step>("email")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [devOtp, setDevOtp] = React.useState<string | null>(null)

  async function onRequestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setDevOtp(null)
    try {
      const res = await api.post<{ message: string; devOtp?: string }>(
        "/api/v1/auth/forgot-password",
        {
          email: email.trim(),
        }
      )
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp)
        toast.message("Development mode — use the code shown below.")
      } else {
        toast.success("If an account exists, a code was sent to your email.")
      }
      setStep("reset")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send reset code"
      )
    } finally {
      setLoading(false)
    }
  }

  async function onResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      await api.post("/api/v1/auth/forgot-password/verify", {
        email: email.trim(),
        code: code.trim(),
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
            Reset password / पासवर्ड रीसेट
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {step === "email"
              ? "Enter your staff email. We will send a one-time code."
              : "Enter the code from your email and choose a new password."}
          </p>

          {step === "email" ? (
            <form className="mt-6 space-y-4" onSubmit={onRequestOtp}>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email / ईमेल</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="h-10 w-full cursor-pointer bg-sky-800 transition-colors duration-200 hover:bg-sky-900"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send code / कोड भेजें"}
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onResetPassword}>
              {devOtp ? (
                <div
                  role="status"
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
                >
                  <p className="font-medium">Development OTP (local only)</p>
                  <p className="mt-1 font-mono text-lg tracking-widest">{devOtp}</p>
                  <p className="mt-1 text-xs text-amber-900/80">
                    SMTP is not configured. In production this code is sent by
                    email only. With Mailpit, check{" "}
                    <a
                      href="http://localhost:8025"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline"
                    >
                      localhost:8025
                    </a>
                    .
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="forgot-code">One-time code / OTP</Label>
                <Input
                  id="forgot-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-new">New password / नया पासवर्ड</Label>
                <Input
                  id="forgot-new"
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
                <Label htmlFor="forgot-confirm">Confirm password</Label>
                <Input
                  id="forgot-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="h-10 w-full cursor-pointer bg-sky-800 transition-colors duration-200 hover:bg-sky-900"
                disabled={loading}
              >
                {loading ? "Updating…" : "Reset password / पासवर्ड बदलें"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full cursor-pointer"
                disabled={loading}
                onClick={() => {
                  setDevOtp(null)
                  setStep("email")
                }}
              >
                Use a different email
              </Button>
            </form>
          )}

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
