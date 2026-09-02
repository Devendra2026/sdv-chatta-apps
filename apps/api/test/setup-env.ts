/** Shared env for API unit/e2e tests. Never used in production. */
process.env.SESSION_SECRET ??= "test-session-secret-change-me-32ch"
process.env.REDIS_URL ??= "redis://localhost:6380"
process.env.DATABASE_URL ??=
  "postgresql://chhata:chhata@localhost:5433/chhata?schema=public"
process.env.PUBLIC_APP_URL ??= "http://localhost:3000"
process.env.CORS_ORIGIN ??= "http://localhost:3000,http://localhost:3001"
process.env.SESSION_COOKIE_NAME ??= "chhata_session"
