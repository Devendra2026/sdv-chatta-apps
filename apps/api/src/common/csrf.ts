import { randomBytes, timingSafeEqual } from "node:crypto"
import type { Request, Response } from "express"

export const CSRF_COOKIE_NAME =
  process.env.CSRF_COOKIE_NAME?.trim() || "csrf_token"
export const CSRF_HEADER_NAME = "x-csrf-token"

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url")
}

export function readCsrfCookie(req: Request): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const part of header.split(";")) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(`${CSRF_COOKIE_NAME}=`)) continue
    const value = trimmed.slice(CSRF_COOKIE_NAME.length + 1)
    if (value.trim()) return decodeURIComponent(value.trim())
  }
  return undefined
}

export function csrfTokensMatch(cookieToken: string, headerToken: string): boolean {
  const a = Buffer.from(cookieToken)
  const b = Buffer.from(headerToken)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function attachCsrfCookie(res: Response, token: string): void {
  const parts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 8}`,
  ]
  const secure =
    process.env.PUBLIC_APP_URL?.startsWith("https://") ||
    res.req?.headers["x-forwarded-proto"] === "https"
  if (secure) parts.push("Secure")
  res.append("Set-Cookie", parts.join("; "))
}

export function isMutatingMethod(method: string | undefined): boolean {
  const m = method?.toUpperCase()
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE"
}
