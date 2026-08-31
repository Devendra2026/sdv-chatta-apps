import { NextResponse } from "next/server"

type CookieSameSite = "lax" | "strict" | "none"

function parseSetCookie(raw: string): {
  name: string
  value: string
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: CookieSameSite
  maxAge?: number
} | null {
  const parts = raw
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
  const first = parts[0]
  if (!first) return null
  const eq = first.indexOf("=")
  if (eq <= 0) return null
  const name = first.slice(0, eq)
  const value = first.slice(eq + 1)
  let path = "/"
  let httpOnly = false
  let secure = false
  let sameSite: CookieSameSite = "lax"
  let maxAge: number | undefined
  for (const part of parts.slice(1)) {
    const [rawKey, ...rest] = part.split("=")
    const key = rawKey?.trim().toLowerCase() ?? ""
    const attrValue = rest.join("=").trim()
    if (key === "path" && attrValue) path = attrValue
    if (key === "httponly") httpOnly = true
    if (key === "secure") secure = true
    if (key === "samesite") {
      const s = attrValue.toLowerCase()
      if (s === "strict" || s === "none" || s === "lax") sameSite = s
    }
    if (key === "max-age") {
      const n = Number(attrValue)
      if (Number.isFinite(n)) maxAge = n
    }
  }
  return { name, value, path, httpOnly, secure, sameSite, maxAge }
}

/**
 * Re-apply upstream Set-Cookie on the portal response.
 * Traefik terminates TLS, so the Next container sees http — Secure cookies
 * must still be written so the browser on https://portal.npchhata.com stores them.
 */
export function applyUpstreamSetCookies(
  res: NextResponse,
  setCookies: string[],
  forceSecure: boolean
): void {
  for (const raw of setCookies) {
    res.headers.append("set-cookie", raw)
    const parsed = parseSetCookie(raw)
    if (!parsed) continue
    const secure =
      forceSecure ||
      parsed.secure ||
      parsed.name.startsWith("__Secure-") ||
      parsed.name.startsWith("__Host-")
    res.cookies.set({
      name: parsed.name,
      value: parsed.value,
      path: parsed.path,
      httpOnly: parsed.httpOnly,
      secure,
      sameSite: parsed.sameSite,
      ...(parsed.maxAge !== undefined ? { maxAge: parsed.maxAge } : {}),
    })
  }
}
