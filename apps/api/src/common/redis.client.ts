import IORedis from "ioredis"

let client: IORedis | null = null

export function getRedisClient(): IORedis | null {
  if (client) return client
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null
  client = new IORedis(url, { maxRetriesPerRequest: null })
  return client
}
