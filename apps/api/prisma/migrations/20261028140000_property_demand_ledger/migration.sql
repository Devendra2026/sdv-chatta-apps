-- CreateEnum
CREATE TYPE "PropertyDemandStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxAdjustmentKind" AS ENUM ('REBATE', 'PENALTY');

-- CreateEnum
CREATE TYPE "TaxAdjustmentHead" AS ENUM ('PROPERTY', 'WATER');

-- CreateEnum
CREATE TYPE "TaxAdjustmentMethod" AS ENUM ('PERCENT_OF_HEAD', 'FLAT_AMOUNT');

-- CreateEnum
CREATE TYPE "TaxAdjustmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "YearEndRunStatus" AS ENUM ('PREVIEWED', 'COMMITTED');

-- CreateTable
CREATE TABLE "property_demand" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "assessmentYearId" TEXT NOT NULL,
    "status" "PropertyDemandStatus" NOT NULL DEFAULT 'DRAFT',
    "propertyTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "waterTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "drainageTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "penalty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rebate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "arrears" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currentDemand" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPayable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outstanding" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "snapshot" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_arrear" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "sourceAssessmentYearId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "demand_arrear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_adjustment_rule" (
    "id" TEXT NOT NULL,
    "kind" "TaxAdjustmentKind" NOT NULL,
    "head" "TaxAdjustmentHead" NOT NULL,
    "assessmentYearId" TEXT,
    "name" TEXT NOT NULL,
    "method" "TaxAdjustmentMethod" NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "cap" DECIMAL(14,2),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "status" "TaxAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_adjustment_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_end_run" (
    "id" TEXT NOT NULL,
    "fromAssessmentYearId" TEXT NOT NULL,
    "toAssessmentYearId" TEXT NOT NULL,
    "status" "YearEndRunStatus" NOT NULL,
    "summary" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "year_end_run_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "payment" ADD COLUMN "propertyDemandId" TEXT,
ADD COLUMN "receiptSnapshot" JSONB,
ADD COLUMN "clientIdempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "property_demand_surveyId_assessmentYearId_key" ON "property_demand"("surveyId", "assessmentYearId");

-- CreateIndex
CREATE INDEX "property_demand_status_idx" ON "property_demand"("status");

-- CreateIndex
CREATE INDEX "property_demand_assessmentYearId_idx" ON "property_demand"("assessmentYearId");

-- CreateIndex
CREATE INDEX "property_demand_surveyId_idx" ON "property_demand"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "demand_arrear_demandId_sourceAssessmentYearId_key" ON "demand_arrear"("demandId", "sourceAssessmentYearId");

-- CreateIndex
CREATE INDEX "tax_adjustment_rule_kind_head_status_idx" ON "tax_adjustment_rule"("kind", "head", "status");

-- CreateIndex
CREATE INDEX "tax_adjustment_rule_assessmentYearId_idx" ON "tax_adjustment_rule"("assessmentYearId");

-- CreateIndex
CREATE UNIQUE INDEX "year_end_run_fromAssessmentYearId_toAssessmentYearId_key" ON "year_end_run"("fromAssessmentYearId", "toAssessmentYearId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_clientIdempotencyKey_key" ON "payment"("clientIdempotencyKey");

-- AddForeignKey
ALTER TABLE "property_demand" ADD CONSTRAINT "property_demand_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_demand" ADD CONSTRAINT "property_demand_assessmentYearId_fkey" FOREIGN KEY ("assessmentYearId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_arrear" ADD CONSTRAINT "demand_arrear_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "property_demand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_arrear" ADD CONSTRAINT "demand_arrear_sourceAssessmentYearId_fkey" FOREIGN KEY ("sourceAssessmentYearId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_adjustment_rule" ADD CONSTRAINT "tax_adjustment_rule_assessmentYearId_fkey" FOREIGN KEY ("assessmentYearId") REFERENCES "reference_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_end_run" ADD CONSTRAINT "year_end_run_fromAssessmentYearId_fkey" FOREIGN KEY ("fromAssessmentYearId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_end_run" ADD CONSTRAINT "year_end_run_toAssessmentYearId_fkey" FOREIGN KEY ("toAssessmentYearId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_propertyDemandId_fkey" FOREIGN KEY ("propertyDemandId") REFERENCES "property_demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
