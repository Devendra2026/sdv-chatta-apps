"use client"

import { Building2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { authClient } from "@/lib/auth-client"

export default function SignupPage() {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setLoading(true)
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      })
      if (result.error) {
        toast.error(result.error.message ?? "Signup failed")
        return
      }
      toast.success("Account created — signed in")
      window.location.assign("/dashboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh overflow-hidden bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(3,105,161,0.3),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(15,23,42,0.95),transparent_40%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[48px_48px] opacity-[0.07]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-950/20 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-700 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Nagar Panchayat Chhata
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                Staff signup
              </h1>
            </div>
          </div>

          <p className="mb-6 text-sm text-slate-500">
            New accounts receive a default <strong>Surveyor</strong> role. The
            first admin email from seed becomes <strong>Super Admin</strong>.
          </p>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full cursor-pointer bg-sky-700 hover:bg-sky-800"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-sky-700 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
