import IORedis from "ioredis"

let client: IORedis | null = null

export function resolveRedisUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.REDIS_URL?.trim()
  if (!url) {
    throw new Error("REDIS_URL is required")
  }
  return url
}

export function getRedisClient(): IORedis {
  if (client) return client
  client = new IORedis(resolveRedisUrl(), {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  })
  return client
}

export async function pingRedis(): Promise<boolean> {
  try {
    return (await getRedisClient().ping()) === "PONG"
  } catch {
    return false
  }
}

export async function closeRedisClient(): Promise<void> {
  if (!client) return
  const current = client
  client = null
  await current.quit().catch(() => current.disconnect())
}
