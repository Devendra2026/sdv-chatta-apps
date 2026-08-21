-- Better Auth 1.7: account identity scoped by issuer + accountId
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" TEXT;

-- Credential accounts use synthetic issuer local:credential
UPDATE "account"
SET "issuer" = 'local:credential'
WHERE "providerId" = 'credential'
  AND ("issuer" IS NULL OR "issuer" = '');

-- Any remaining rows (should be none in this app) get a safe local issuer
UPDATE "account"
SET "issuer" = CONCAT('local:oauth:', "providerId")
WHERE "issuer" IS NULL OR "issuer" = '';

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx"
  ON "account" ("issuer", "accountId");
