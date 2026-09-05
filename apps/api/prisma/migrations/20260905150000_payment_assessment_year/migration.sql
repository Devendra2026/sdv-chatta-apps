-- AlterTable
ALTER TABLE "payment" ADD COLUMN "assessmentYearId" TEXT;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_assessmentYearId_fkey" FOREIGN KEY ("assessmentYearId") REFERENCES "reference_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "payment_surveyId_status_assessmentYearId_idx" ON "payment"("surveyId", "status", "assessmentYearId");

-- Backfill SUCCESS payments with the latest published assessment year for the survey's ward
UPDATE "payment" AS p
SET "assessmentYearId" = latest."assessmentYearId"
FROM (
  SELECT DISTINCT ON (s.id)
    s.id AS "surveyId",
    tc."assessmentYearId" AS "assessmentYearId"
  FROM "survey" s
  INNER JOIN "tax_config" tc ON tc."wardId" = s."wardId" AND tc.status = 'PUBLISHED'
  INNER JOIN "reference_entry" re ON re.id = tc."assessmentYearId"
  ORDER BY s.id, re.code DESC, re.name DESC, tc."updatedAt" DESC
) AS latest
WHERE p."surveyId" = latest."surveyId"
  AND p.status = 'SUCCESS'
  AND p."assessmentYearId" IS NULL;
