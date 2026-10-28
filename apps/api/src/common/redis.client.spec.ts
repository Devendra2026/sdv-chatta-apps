import {
  createAppRedisRetryStrategy,
  formatRedisTargetLabel,
  redisUnreachableMessage,
  resolveRedisUrl,
} from "./redis.client"

describe("redis.client helpers", () => {
  it("resolveRedisUrl requires REDIS_URL", () => {
    expect(() => resolveRedisUrl({})).toThrow(/REDIS_URL is required/)
  })

  it("resolveRedisUrl returns trimmed URL", () => {
    expect(resolveRedisUrl({ REDIS_URL: "  redis://localhost:6380  " })).toBe(
      "redis://localhost:6380"
    )
  })

  it("formatRedisTargetLabel strips userinfo and keeps host:port", () => {
    expect(formatRedisTargetLabel("redis://:secret@redis:6379")).toBe(
      "redis:6379"
    )
    expect(formatRedisTargetLabel("redis://localhost:6380")).toBe(
      "localhost:6380"
    )
  })

  it("formatRedisTargetLabel defaults redis port when omitted", () => {
    expect(formatRedisTargetLabel("redis://127.0.0.1")).toBe("127.0.0.1:6379")
  })

  it("formatRedisTargetLabel handles invalid URLs safely", () => {
    expect(formatRedisTargetLabel("not-a-url")).toBe("invalid-REDIS_URL")
  })

  it("createAppRedisRetryStrategy stops after max attempts", () => {
    expect(createAppRedisRetryStrategy(1, 3)).toBe(200)
    expect(createAppRedisRetryStrategy(3, 3)).toBe(200)
    expect(createAppRedisRetryStrategy(4, 3)).toBeNull()
  })

  it("redisUnreachableMessage names sanitized target and compose hint", () => {
    const message = redisUnreachableMessage({
      REDIS_URL: "redis://:password@localhost:6380",
    })
    expect(message).toContain("localhost:6380")
    expect(message).not.toContain("password")
    expect(message).toContain("docker compose up -d postgres redis mailpit")
  })
})
