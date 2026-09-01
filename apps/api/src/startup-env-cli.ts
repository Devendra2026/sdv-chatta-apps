import "dotenv/config"

import { assertRequiredEnv } from "./config/validate-env"

try {
  assertRequiredEnv({ includeSeedAdmin: true })
  console.log("[startup] Environment validation passed.")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[startup] ${message}`)
  process.exit(1)
}
