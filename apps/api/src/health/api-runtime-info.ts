import { readFileSync } from "node:fs"
import { join } from "node:path"

/** Non-secret build/runtime identity for diagnostics and response headers. */
export type ApiRuntimeInfo = {
  service: "api"
  buildId: string
  pid: number
  nodeEnv: string
}

let cachedBuildId: string | undefined

function readPackageVersion(): string | undefined {
  try {
    const pkgPath = join(__dirname, "..", "..", "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }
    return pkg.version?.trim() || undefined
  } catch {
    return undefined
  }
}

export function resolveApiBuildId(): string {
  if (cachedBuildId) return cachedBuildId

  const fromEnv =
    process.env.API_BUILD_ID?.trim() ||
    process.env.GIT_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim()

  cachedBuildId = fromEnv || readPackageVersion() || "dev"
  return cachedBuildId
}

export function getApiRuntimeInfo(): ApiRuntimeInfo {
  return {
    service: "api",
    buildId: resolveApiBuildId(),
    pid: process.pid,
    nodeEnv: process.env.NODE_ENV ?? "development",
  }
}

export const API_BUILD_ID_HEADER = "x-api-build-id"
export const API_PID_HEADER = "x-api-pid"
