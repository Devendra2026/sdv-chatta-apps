-- CreateEnum
CREATE TYPE "ReferenceEntryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaxConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "reference_category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_entry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ReferenceEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_config" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "assessmentYearId" TEXT NOT NULL,
    "status" "TaxConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3),
    "propertyTaxPct" DECIMAL(8,4) NOT NULL DEFAULT 10,
    "waterTaxPct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "drainageTaxPct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "penaltyPct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "assessablePct" DECIMAL(8,4) NOT NULL DEFAULT 80,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rate_cell" (
    "id" TEXT NOT NULL,
    "taxConfigId" TEXT NOT NULL,
    "roadWidthEntryId" TEXT NOT NULL,
    "constructionEntryId" TEXT NOT NULL,
    "annualRatePerSqFt" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rate_cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_config_version" (
    "id" TEXT NOT NULL,
    "taxConfigId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_config_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reference_category_code_key" ON "reference_category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reference_entry_categoryId_code_key" ON "reference_entry"("categoryId", "code");

-- CreateIndex
CREATE INDEX "reference_entry_categoryId_status_idx" ON "reference_entry"("categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_config_wardId_assessmentYearId_key" ON "tax_config"("wardId", "assessmentYearId");

-- CreateIndex
CREATE INDEX "tax_config_wardId_assessmentYearId_idx" ON "tax_config"("wardId", "assessmentYearId");

-- CreateIndex
CREATE INDEX "tax_config_status_idx" ON "tax_config"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rate_cell_taxConfigId_roadWidthEntryId_constructionEntry_key" ON "tax_rate_cell"("taxConfigId", "roadWidthEntryId", "constructionEntryId");

-- CreateIndex
CREATE INDEX "tax_config_version_taxConfigId_version_idx" ON "tax_config_version"("taxConfigId", "version");

-- AddForeignKey
ALTER TABLE "reference_entry" ADD CONSTRAINT "reference_entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "reference_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_config" ADD CONSTRAINT "tax_config_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_config" ADD CONSTRAINT "tax_config_assessmentYearId_fkey" FOREIGN KEY ("assessmentYearId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rate_cell" ADD CONSTRAINT "tax_rate_cell_taxConfigId_fkey" FOREIGN KEY ("taxConfigId") REFERENCES "tax_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rate_cell" ADD CONSTRAINT "tax_rate_cell_roadWidthEntryId_fkey" FOREIGN KEY ("roadWidthEntryId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rate_cell" ADD CONSTRAINT "tax_rate_cell_constructionEntryId_fkey" FOREIGN KEY ("constructionEntryId") REFERENCES "reference_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_config_version" ADD CONSTRAINT "tax_config_version_taxConfigId_fkey" FOREIGN KEY ("taxConfigId") REFERENCES "tax_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
