/**
 * Local-dev only: refuse to start host turbo/pnpm watchers when
 * 3000 / 3001 / 4000 are already bound (often leftover
 * `docker compose --profile app` containers).
 *
 * Does not kill processes. Production is unaffected.
 */
import net from "node:net"

const PORTS = [
  { port: 4000, label: "API" },
  { port: 3000, label: "Portal" },
  { port: 3001, label: "Web" },
]

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
  console.error("  docker compose up -d")
  console.error("")
  console.error(
    "This script does not kill processes — free the ports manually, then retry.",
  )
  process.exit(1)
}

console.log("Local ports 3000 / 3001 / 4000 are free.")
