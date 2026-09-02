-- Durable session revocation metadata. Active lookup remains Redis + tokenHash.
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "session_userId_revokedAt_idx" ON "session"("userId", "revokedAt");
