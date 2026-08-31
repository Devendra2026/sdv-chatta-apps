import {
  resolveCookieHeaderForProxy,
  resolveForwardedProto,
} from "@workspace/types"
import { cookies, headers } from "next/headers"

import { type MeUser } from "@/lib/api"
import { apiInternalUrl } from "@/lib/proxy-to-api"

export type CurrentUserResult =
  | { status: "ok"; user: MeUser }
  | { status: "unauthenticated" }
  | { status: "unavailable" }

export async function fetchCurrentUser(): Promise<CurrentUserResult> {
  const requestHeaders = await headers()
  const jar = await cookies()
  const cookie = resolveCookieHeaderForProxy(
    requestHeaders.get("cookie"),
    jar.getAll()
  )
  if (!cookie) return { status: "unauthenticated" }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    requestHeaders.get("origin") ??
    "http://localhost:3000"
  const proto = resolveForwardedProto({
    forwardedProtoHeader: requestHeaders.get("x-forwarded-proto"),
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    originHeader: requestHeaders.get("origin"),
    requestProtocol: origin.startsWith("https") ? "https:" : "http:",
  })

  try {
    const response = await fetch(`${apiInternalUrl()}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        cookie,
        origin,
        accept: "application/json",
        "x-forwarded-host": requestHeaders.get("host") ?? "",
        "x-forwarded-proto": proto,
      },
      cache: "no-store",
    })
    if (response.status === 401 || response.status === 403) {
      return { status: "unauthenticated" }
    }
    if (!response.ok) return { status: "unavailable" }
    const json = (await response.json()) as {
      success?: boolean
      data?: MeUser
    }
    if (!json.success || !json.data?.id) return { status: "unavailable" }
    return { status: "ok", user: json.data }
  } catch {
    return { status: "unavailable" }
  }
}
