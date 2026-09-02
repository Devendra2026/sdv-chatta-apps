-- Session tokens stored as HMAC-SHA256 hashes only (invalidates all existing sessions).
TRUNCATE TABLE "session";

ALTER TABLE "session" DROP COLUMN IF EXISTS "token";
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "session" SET "tokenHash" = '' WHERE "tokenHash" IS NULL;

ALTER TABLE "session" ALTER COLUMN "tokenHash" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "session_tokenHash_key" ON "session"("tokenHash");
