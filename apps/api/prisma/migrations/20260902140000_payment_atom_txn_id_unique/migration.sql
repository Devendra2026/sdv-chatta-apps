-- Phase 4: unique gateway transaction id for idempotent callback dedupe
DROP INDEX IF EXISTS "payment_atomTxnId_idx";

CREATE UNIQUE INDEX "payment_atomTxnId_key" ON "payment"("atomTxnId");
