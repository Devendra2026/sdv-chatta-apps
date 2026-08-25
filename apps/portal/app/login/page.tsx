"use client"

import { Building2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { authClient } from "@/lib/auth-client"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.5-2.4 1.9C5.1 19.3 8.3 21.2 12 21.2c2.4 0 4.4-.8 5.9-2.2l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M3.5 7.3C2.8 8.7 2.4 10.3 2.4 12s.4 3.3 1.1 4.7l3.1-2.4c-.3-.9-.5-1.8-.5-2.3s.2-1.4.5-2.3L3.5 7.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.5c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 2.7 14.4 1.8 12 1.8 8.3 1.8 5.1 3.7 3.5 7.3l3.1 2.4C7.9 7 9.8 5.5 12 5.5z"
      />
    </svg>
  )
}

function mapAuthErrorMessage(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase()
  if (
    m.includes("signup") ||
    m.includes("sign up") ||
    m.includes("not enabled") ||
    m.includes("disabled") ||
    m.includes("account not linked") ||
    m.includes("user not found")
  ) {
    return "Your account is not provisioned. Contact an administrator."
  }
  return message?.trim() || "Login failed"
}

export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error =
      params.get("error") ??
      params.get("error_description") ??
      params.get("message")
    if (error) {
      toast.error(mapAuthErrorMessage(decodeURIComponent(error)))
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      url.searchParams.delete("error_description")
      url.searchParams.delete("message")
      window.history.replaceState({}, "", url.pathname + url.search)
    }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        toast.error(mapAuthErrorMessage(result.error.message))
        return
      }
      toast.success("Signed in")
      window.location.assign("/dashboard")
    } catch (err) {
      toast.error(
        mapAuthErrorMessage(err instanceof Error ? err.message : "Login failed")
      )
    } finally {
      setLoading(false)
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login",
      })
      if (result.error) {
        toast.error(mapAuthErrorMessage(result.error.message))
        setGoogleLoading(false)
      }
      // On success Better Auth redirects to Google / callback
    } catch (err) {
      toast.error(
        mapAuthErrorMessage(
          err instanceof Error ? err.message : "Google sign-in failed"
        )
      )
      setGoogleLoading(false)
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
            Use your staff account to access the dashboard. New accounts are
            created by an administrator.
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
              disabled={loading || googleLoading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-full cursor-pointer border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            disabled={loading || googleLoading}
            onClick={() => void onGoogleSignIn()}
          >
            <GoogleIcon className="mr-2 size-5" />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>
        </div>
      </div>
    </div>
  )
}
