-- Align TaxConfig defaults with Chhata tax formula (water 7.5%, drainage 2.5%,
-- commercial assessable %). Safe backfill: only fill water/drainage when still 0.

ALTER TABLE "tax_config"
  ADD COLUMN IF NOT EXISTS "commercialAssessablePct" DECIMAL(8,4) NOT NULL DEFAULT 80;

ALTER TABLE "tax_config"
  ALTER COLUMN "waterTaxPct" SET DEFAULT 7.5;

ALTER TABLE "tax_config"
  ALTER COLUMN "drainageTaxPct" SET DEFAULT 2.5;

UPDATE "tax_config"
SET "waterTaxPct" = 7.5
WHERE "waterTaxPct" = 0;

UPDATE "tax_config"
SET "drainageTaxPct" = 2.5
WHERE "drainageTaxPct" = 0;
