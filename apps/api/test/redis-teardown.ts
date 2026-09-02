import { closeRedisClient } from "../src/common/redis.client"

export default async function closeTestRedis(): Promise<void> {
  await closeRedisClient()
}
