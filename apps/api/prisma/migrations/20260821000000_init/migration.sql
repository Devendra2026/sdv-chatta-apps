-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "DataQualityStatus" AS ENUM ('COMPLETE', 'NEEDS_REVIEW', 'INVALID', 'DUPLICATE', 'MISSING_CONTACT', 'MISSING_PROPERTY_NUMBER', 'MISSING_MEASUREMENT');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'READY', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DuplicateStrategy" AS ENUM ('SKIP', 'UPDATE', 'CREATE');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONLINE', 'CASH', 'CHEQUE', 'DD', 'UPI_MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'ACTIVE',
    "dataQualityStatus" "DataQualityStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "surveyedAt" TIMESTAMP(3),
    "wardId" TEXT NOT NULL,
    "ownerName" TEXT,
    "ownerFatherName" TEXT,
    "mobile" TEXT,
    "ownerAadhaar" TEXT,
    "isSlum" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "parcelNo" TEXT,
    "propertyNo" TEXT,
    "electricityId" TEXT,
    "khasraNo" TEXT,
    "registryNo" TEXT,
    "constructedDate" TEXT,
    "respondentName" TEXT,
    "respondentRelationship" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "houseNo" TEXT,
    "streetName" TEXT,
    "locality" TEXT,
    "colony" TEXT,
    "presentHouseNo" TEXT,
    "presentStreetName" TEXT,
    "presentLocality" TEXT,
    "presentColony" TEXT,
    "presentCity" TEXT,
    "presentPincode" TEXT,
    "isSameAsProperty" BOOLEAN,
    "taxRateZone" TEXT,
    "propertyOwnership" TEXT,
    "propertyUse" TEXT,
    "commercial" TEXT,
    "yearOfConstruction" TEXT,
    "exemptionType" TEXT,
    "exemptionApplicable" BOOLEAN,
    "situation" TEXT,
    "roadType" TEXT,
    "floorsRaw" TEXT,
    "plotAreaSqFt" DECIMAL(14,4),
    "plotAreaSqMeter" DECIMAL(14,4),
    "plinthAreaSqFt" DECIMAL(14,4),
    "plinthAreaSqMeter" DECIMAL(14,4),
    "totalBuiltUpAreaSqFt" DECIMAL(14,4),
    "totalBuiltUpAreaSqMeter" DECIMAL(14,4),
    "hasMunicipalWaterSupply" BOOLEAN,
    "hasAlternateWater" BOOLEAN,
    "waterSourceType" TEXT,
    "totalWaterConnections" INTEGER,
    "waterConnectionIdType" TEXT,
    "toiletType" TEXT,
    "hasMunicipalWasteService" BOOLEAN,
    "sourceExtras" JSONB,
    "importJobId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_floor" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "floorLabel" TEXT NOT NULL,
    "areaSqFt" DECIMAL(14,4),
    "areaSqMeter" DECIMAL(14,4),
    "usageType" TEXT,
    "usageFactor" TEXT,
    "buildingType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rawSegment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_attachment" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_job" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "objectKey" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "mappingPreset" TEXT,
    "columnMapping" JSONB,
    "duplicateStrategy" "DuplicateStrategy" NOT NULL DEFAULT 'SKIP',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "insertedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "errorFileKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_error" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "surveyId" TEXT,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "rawRow" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_error_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_job" (
    "id" TEXT NOT NULL,
    "filters" JSONB,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "fileKey" TEXT,
    "fileName" TEXT,
    "rowCount" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "merchTxnId" TEXT,
    "atomTxnId" TEXT,
    "surveyId" TEXT,
    "wardId" TEXT,
    "payerName" TEXT,
    "payerMobile" TEXT,
    "payerEmail" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMode" "PaymentMode" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "gateway" TEXT,
    "gatewayReference" TEXT,
    "receiptNumber" TEXT,
    "collectionDate" TIMESTAMP(3),
    "chequeDdReference" TEXT,
    "remarks" TEXT,
    "collectedById" TEXT,
    "attachmentKey" TEXT,
    "refundableAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transaction" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "statusCode" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_callback" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "merchTxnId" TEXT,
    "atomTxnId" TEXT,
    "statusCode" TEXT,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_callback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "refundReference" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "gatewayRefundId" TEXT,
    "reason" TEXT,
    "rawResponse" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settlement" (
    "id" TEXT NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "merchTxnId" TEXT,
    "atomTxnId" TEXT,
    "amount" DECIMAL(14,2),
    "status" TEXT,
    "settlementUtr" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "actorId" TEXT,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- CreateIndex
CREATE INDEX "user_role_roleId_idx" ON "user_role"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_userId_roleId_key" ON "user_role"("userId", "roleId");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_roleId_permissionId_key" ON "role_permission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ward_code_key" ON "ward"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ward_number_key" ON "ward"("number");

-- CreateIndex
CREATE UNIQUE INDEX "survey_surveyId_key" ON "survey"("surveyId");

-- CreateIndex
CREATE INDEX "survey_wardId_idx" ON "survey"("wardId");

-- CreateIndex
CREATE INDEX "survey_mobile_idx" ON "survey"("mobile");

-- CreateIndex
CREATE INDEX "survey_ownerName_idx" ON "survey"("ownerName");

-- CreateIndex
CREATE INDEX "survey_parcelNo_idx" ON "survey"("parcelNo");

-- CreateIndex
CREATE INDEX "survey_propertyNo_idx" ON "survey"("propertyNo");

-- CreateIndex
CREATE INDEX "survey_status_idx" ON "survey"("status");

-- CreateIndex
CREATE INDEX "survey_createdAt_idx" ON "survey"("createdAt");

-- CreateIndex
CREATE INDEX "survey_surveyedAt_idx" ON "survey"("surveyedAt");

-- CreateIndex
CREATE INDEX "survey_wardId_surveyedAt_idx" ON "survey"("wardId", "surveyedAt");

-- CreateIndex
CREATE INDEX "survey_wardId_parcelNo_propertyNo_idx" ON "survey"("wardId", "parcelNo", "propertyNo");

-- CreateIndex
CREATE INDEX "survey_dataQualityStatus_idx" ON "survey"("dataQualityStatus");

-- CreateIndex
CREATE INDEX "survey_floor_surveyId_idx" ON "survey_floor"("surveyId");

-- CreateIndex
CREATE INDEX "survey_attachment_surveyId_idx" ON "survey_attachment"("surveyId");

-- CreateIndex
CREATE INDEX "import_job_status_idx" ON "import_job"("status");

-- CreateIndex
CREATE INDEX "import_job_createdById_idx" ON "import_job"("createdById");

-- CreateIndex
CREATE INDEX "import_error_importJobId_idx" ON "import_error"("importJobId");

-- CreateIndex
CREATE INDEX "export_job_status_idx" ON "export_job"("status");

-- CreateIndex
CREATE INDEX "export_job_createdById_idx" ON "export_job"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "payment_paymentReference_key" ON "payment"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_merchTxnId_key" ON "payment"("merchTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receiptNumber_key" ON "payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_status_idx" ON "payment"("status");

-- CreateIndex
CREATE INDEX "payment_createdAt_idx" ON "payment"("createdAt");

-- CreateIndex
CREATE INDEX "payment_atomTxnId_idx" ON "payment"("atomTxnId");

-- CreateIndex
CREATE INDEX "payment_surveyId_idx" ON "payment"("surveyId");

-- CreateIndex
CREATE INDEX "payment_wardId_idx" ON "payment"("wardId");

-- CreateIndex
CREATE INDEX "payment_paymentMode_idx" ON "payment"("paymentMode");

-- CreateIndex
CREATE INDEX "payment_transaction_paymentId_idx" ON "payment_transaction"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_callback_idempotencyKey_key" ON "payment_callback"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_callback_merchTxnId_idx" ON "payment_callback"("merchTxnId");

-- CreateIndex
CREATE INDEX "payment_callback_atomTxnId_idx" ON "payment_callback"("atomTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refund_refundReference_key" ON "payment_refund"("refundReference");

-- CreateIndex
CREATE INDEX "payment_refund_paymentId_idx" ON "payment_refund"("paymentId");

-- CreateIndex
CREATE INDEX "payment_refund_status_idx" ON "payment_refund"("status");

-- CreateIndex
CREATE INDEX "payment_settlement_merchTxnId_idx" ON "payment_settlement"("merchTxnId");

-- CreateIndex
CREATE INDEX "payment_settlement_settlementDate_idx" ON "payment_settlement"("settlementDate");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_floor" ADD CONSTRAINT "survey_floor_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_attachment" ADD CONSTRAINT "survey_attachment_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_attachment" ADD CONSTRAINT "survey_attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_error" ADD CONSTRAINT "import_error_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "import_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_callback" ADD CONSTRAINT "payment_callback_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refund" ADD CONSTRAINT "payment_refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
