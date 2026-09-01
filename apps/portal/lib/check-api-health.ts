export type ApiHealthResult = {
  ok: boolean
  status: number
  message: string
}

/**
 * Client-side health check via same-origin portal proxy (/api/v1/health).
 */
export async function checkApiHealth(): Promise<ApiHealthResult> {
  try {
    const response = await fetch("/api/v1/health", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    })

    const json = (await response.json().catch(() => null)) as {
      success?: boolean
      error?: { code?: string; message?: string }
    } | null

    if (response.ok && json?.success) {
      return { ok: true, status: response.status, message: "ok" }
    }

    const message =
      json?.error?.message?.trim() ||
      (response.status === 502 || response.status === 503
        ? "API is unavailable"
        : response.status === 404
          ? "Not found: GET /api/v1/health"
          : response.statusText || "Health check failed")

    return {
      ok: false,
      status: response.status,
      message,
    }
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Cannot reach API",
    }
  }
}
