"use client"

import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { api } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function onRequestLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post<{ message: string }>("/api/v1/auth/forgot-password", {
        email: email.trim(),
      })
      setSent(true)
      toast.success("If an account exists, a reset link was sent to your email.")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send reset link"
      )
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
            {sent
              ? "Check your email for a secure reset link (valid for 30 minutes)."
              : "Enter your staff email. We will send a secure reset link."}
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-slate-600">
                Did not receive it? Check spam or request again after a few
                minutes.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full cursor-pointer"
                onClick={() => setSent(false)}
              >
                Send another link
              </Button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onRequestLink}>
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
                {loading ? "Sending…" : "Send reset link / लिंक भेजें"}
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
