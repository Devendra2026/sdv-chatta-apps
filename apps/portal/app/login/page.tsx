"use client"

import { Building2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { authClient } from "@/lib/auth-client"

export default function LoginPage() {
  const [email, setEmail] = React.useState("sikarwar2010@gmail.com")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        toast.error(result.error.message ?? "Login failed")
        return
      }
      toast.success("Signed in")
      // Hard navigate so proxy/layout see the new session cookie immediately
      window.location.assign("/dashboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh overflow-hidden bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(3,105,161,0.35),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(15,23,42,0.9),transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[48px_48px] opacity-[0.07]"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="hidden text-slate-100 lg:block">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-900/40">
            <Building2 className="size-7" />
          </div>
          <p className="text-sm font-medium tracking-wide text-sky-300/90 uppercase">
            Nagar Panchayat Chhata
          </p>
          <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight text-balance">
            Survey, property &amp; payment operations
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            Secure municipal portal for Mathura ward surveys, offline
            collection, and gateway payments — built for day-to-day staff use.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-950/20 sm:p-8">
          <div className="mb-6 lg:hidden">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-sky-700 text-white">
              <Building2 className="size-5" />
            </div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Nagar Panchayat Chhata
            </p>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use your staff account to access the dashboard
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full cursor-pointer bg-sky-700 hover:bg-sky-800"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Need an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-sky-700 underline-offset-4 hover:underline"
            >
              Create staff signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
