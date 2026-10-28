/**
 * Local-dev only: refuse to start host turbo/pnpm watchers when
 * 3000 / 3001 / 4000 are already bound (often leftover
 * `docker compose --profile app` containers), or when loopback
 * Redis / Postgres from apps/api/.env refuse connections.
 *
 * Does not kill processes. Production is unaffected.
 * Never prints .env contents or credentials.
 */
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PORTS = [
  { port: 4000, label: "API" },
  { port: 3000, label: "Portal" },
  { port: 3001, label: "Web" },
]

const COMPOSE_HINT = "docker compose up -d postgres redis mailpit"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const API_ENV_PATH = path.join(ROOT, "apps", "api", ".env")

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once("error", (err) => {
      resolve(err?.code !== "EADDRINUSE")
    })
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port, "0.0.0.0")
  })
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host })
    socket.setTimeout(500)
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("timeout", () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("error", () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function isPortInUse(port) {
  if (!(await canBind(port))) return true
  if (await canConnect(port, "127.0.0.1")) return true
  if (await canConnect(port, "::1")) return true
  return false
}

function isLoopbackHost(host) {
  if (!host) return false
  const h = host.toLowerCase()
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]"
  )
}

function parseEnvFile(filePath) {
  const out = {}
  let raw
  try {
    raw = fs.readFileSync(filePath, "utf8")
  } catch {
    return out
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function parseLoopbackEndpoint(urlString, defaultPort) {
  if (!urlString?.trim()) return null
  try {
    const parsed = new URL(urlString.trim())
    if (!isLoopbackHost(parsed.hostname)) return null
    const port = parsed.port ? Number(parsed.port) : defaultPort
    if (!Number.isFinite(port)) return null
    return { host: parsed.hostname, port }
  } catch {
    return null
  }
}

async function endpointReachable({ host, port }) {
  const hosts =
    host === "localhost" ? ["127.0.0.1", "::1"] : [host]
  for (const h of hosts) {
    if (await canConnect(port, h)) return true
  }
  return false
}

const busy = []
for (const { port, label } of PORTS) {
  if (await isPortInUse(port)) {
    busy.push(`  ${label} port ${port}`)
  }
}

if (busy.length > 0) {
  console.error("Local dev ports are already in use:")
  console.error(busy.join("\n"))
  console.error("")
  console.error(
    "If you previously ran the Docker app profile, stop it first:",
  )
  console.error("  docker compose --profile app stop")
  console.error("Then keep infra only:")
  console.error(`  ${COMPOSE_HINT}`)
  console.error("")
  console.error(
    "This script does not kill processes — free the ports manually, then retry.",
  )
  process.exit(1)
}

console.log("Local ports 3000 / 3001 / 4000 are free.")

const apiEnv = parseEnvFile(API_ENV_PATH)
const missingInfra = []

const redisEndpoint = parseLoopbackEndpoint(
  process.env.REDIS_URL ?? apiEnv.REDIS_URL,
  6379,
)
if (redisEndpoint && !(await endpointReachable(redisEndpoint))) {
  missingInfra.push(
    `  Redis not reachable at localhost:${redisEndpoint.port}`,
  )
}

const dbEndpoint = parseLoopbackEndpoint(
  process.env.DATABASE_URL ?? apiEnv.DATABASE_URL,
  5432,
)
if (dbEndpoint && !(await endpointReachable(dbEndpoint))) {
  missingInfra.push(
    `  Postgres not reachable at localhost:${dbEndpoint.port}`,
  )
}

if (missingInfra.length > 0) {
  console.error("Local Docker infra ports are not published:")
  console.error(missingInfra.join("\n"))
  console.error("")
  console.error("Start or recreate infra (keeps named volumes):")
  console.error(`  ${COMPOSE_HINT}`)
  process.exit(1)
}

if (redisEndpoint || dbEndpoint) {
  console.log("Local Redis / Postgres loopback endpoints are reachable.")
}
