import { Logger } from "@nestjs/common"
import IORedis from "ioredis"

const logger = new Logger("Redis")

const APP_MAX_CONNECT_ATTEMPTS = 3
const APP_RETRY_DELAY_MS = 200
const APP_CONNECT_TIMEOUT_MS = 2_000

export const REDIS_LOCAL_COMPOSE_HINT =
  "docker compose up -d postgres redis mailpit"

let client: IORedis | null = null

export function resolveRedisUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.REDIS_URL?.trim()
  if (!url) {
    throw new Error("REDIS_URL is required")
  }
  return url
}

/** Hostname:port only — never userinfo or the full URL. */
export function formatRedisTargetLabel(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname || "unknown"
    const port = parsed.port || "6379"
    return `${host}:${port}`
  } catch {
    return "invalid-REDIS_URL"
  }
}

export function createAppRedisRetryStrategy(
  times: number,
  maxAttempts: number = APP_MAX_CONNECT_ATTEMPTS
): number | null {
  if (times > maxAttempts) return null
  return APP_RETRY_DELAY_MS
}

function attachErrorListener(redis: IORedis, label: string): void {
  redis.on("error", (err: Error & { code?: string }) => {
    const code = err.code ? ` ${err.code}` : ""
    logger.error(`Redis connection error (${label})${code}: ${err.message}`)
  })
}

export function createAppRedisClient(url: string = resolveRedisUrl()): IORedis {
  const label = formatRedisTargetLabel(url)
  const redis = new IORedis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    connectTimeout: APP_CONNECT_TIMEOUT_MS,
    retryStrategy: (times) => createAppRedisRetryStrategy(times),
  })
  attachErrorListener(redis, label)
  return redis
}

/** BullMQ requires maxRetriesPerRequest: null and ongoing reconnect. */
export function createBullMqRedisConnection(
  url: string = resolveRedisUrl()
): IORedis {
  const label = formatRedisTargetLabel(url)
  const redis = new IORedis(url, {
    maxRetriesPerRequest: null,
  })
  attachErrorListener(redis, label)
  return redis
}

export function getRedisClient(): IORedis {
  if (client) return client
  client = createAppRedisClient()
  return client
}

export async function pingRedis(): Promise<boolean> {
  try {
    return (await getRedisClient().ping()) === "PONG"
  } catch {
    return false
  }
}

export function redisUnreachableMessage(
  env: NodeJS.ProcessEnv = process.env
): string {
  let target = "REDIS_URL"
  try {
    target = formatRedisTargetLabel(resolveRedisUrl(env))
  } catch {
    // keep generic label
  }
  return [
    `Redis is required and is not reachable at ${target}.`,
    `Ensure local infra is running: ${REDIS_LOCAL_COMPOSE_HINT}`,
  ].join(" ")
}

export async function closeRedisClient(): Promise<void> {
  if (!client) return
  const current = client
  client = null
  await current.quit().catch(() => current.disconnect())
}
