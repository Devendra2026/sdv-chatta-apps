-- Nest-owned auth: move credential passwords onto user, drop Better Auth account table.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

UPDATE "user" u
SET "passwordHash" = a."password"
FROM "account" a
WHERE a."userId" = u.id
  AND a."providerId" = 'credential'
  AND a."password" IS NOT NULL
  AND u."passwordHash" IS NULL;

DROP TABLE IF EXISTS "account";

CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");
