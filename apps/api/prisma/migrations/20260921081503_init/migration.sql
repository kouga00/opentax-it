-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'TENANT_ADMIN', 'TENANT_USER');

-- CreateEnum
CREATE TYPE "CustomerKind" AS ENUM ('IT_B2B', 'IT_B2C', 'IT_PA', 'EU', 'NON_EU');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TD01', 'TD04', 'TD05', 'TD06');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'DELIVERED', 'NOT_DELIVERED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VatNature" AS ENUM ('N2_1', 'N2_2');

-- CreateEnum
CREATE TYPE "SdiChannel" AS ENUM ('PEC');

-- CreateEnum
CREATE TYPE "SdiTransmissionStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED_BY_PEC', 'DELIVERED_TO_SDI', 'SDI_DELIVERED', 'SDI_NOT_DELIVERED', 'SDI_REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "RuleSetStatus" AS ENUM ('DRAFT', 'PROPOSED', 'ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RuleSourceKind" AS ENUM ('PDF', 'HTML', 'JSON', 'XLS');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxReturnStatus" AS ENUM ('DRAFT', 'FILED');

-- CreateEnum
CREATE TYPE "TaxCreditKind" AS ENUM ('SUBSTITUTE_TAX', 'INPS');

-- CreateEnum
CREATE TYPE "InstallmentPlanKind" AS ENUM ('TAX_BALANCE', 'TAX_FIRST_ADVANCE', 'INPS_BALANCE', 'INPS_FIRST_ADVANCE');

-- CreateEnum
CREATE TYPE "F24Kind" AS ENUM ('BALANCE', 'FIRST_ADVANCE', 'SECOND_ADVANCE', 'INSTALLMENT', 'STAMP_DUTY', 'TAX_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "F24Status" AS ENUM ('PLANNED', 'SCHEDULED_I24', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "F24Section" AS ENUM ('TREASURY', 'INPS');

-- CreateEnum
CREATE TYPE "DeadlineKind" AS ENUM ('TAX_BALANCE', 'TAX_FIRST_ADVANCE', 'TAX_SECOND_ADVANCE', 'INPS_BALANCE', 'INPS_FIRST_ADVANCE', 'INPS_SECOND_ADVANCE', 'INSTALLMENT', 'STAMP_DUTY', 'TAX_RETURN', 'INTRASTAT', 'FOREIGN_VAT', 'TAX_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('OPEN', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TaxNoticeKind" AS ENUM ('IRREGULARITY_NOTICE', 'ELECTRONIC_NOTICE', 'PAYMENT_ORDER', 'EINVOICE_STAMP_DUTY', 'FORMAL_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxNoticeStatus" AS ENUM ('RECEIVED', 'CIVIS_REQUESTED', 'PAID', 'INSTALLMENTS', 'CLOSED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TENANT_USER',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessName" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fiscalCode" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "atecoCode" TEXT NOT NULL,
    "atecoCode2025" TEXT,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "activityStartYear" INTEGER NOT NULL,
    "reducedRate" BOOLEAN NOT NULL DEFAULT false,
    "applyInpsSurcharge" BOOLEAN NOT NULL DEFAULT false,
    "viesRegistered" BOOLEAN NOT NULL DEFAULT false,
    "pecAddress" TEXT,
    "pecCredentialsEnc" TEXT,
    "sdiPecAssigned" TEXT,
    "ibanEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "CustomerKind" NOT NULL,
    "businessName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "vatNumber" TEXT,
    "fiscalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'IT',
    "address" TEXT NOT NULL,
    "postalCode" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "recipientCode" TEXT NOT NULL DEFAULT '0000000',
    "recipientPec" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'TD01',
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "vatNature" "VatNature" NOT NULL DEFAULT 'N2_2',
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "inpsSurcharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "virtualStamp" BOOLEAN NOT NULL DEFAULT false,
    "stampAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "notes" TEXT[],
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "refInvoiceId" TEXT,
    "xmlFileName" TEXT,
    "xmlPath" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "amountEur" DECIMAL(14,2) NOT NULL,
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "method" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SdiTransmission" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "channel" "SdiChannel" NOT NULL DEFAULT 'PEC',
    "fileName" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "pecMessageId" TEXT,
    "status" "SdiTransmissionStatus" NOT NULL DEFAULT 'PENDING',
    "sdiId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SdiTransmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SdiNotification" (
    "id" TEXT NOT NULL,
    "transmissionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "sdiId" TEXT,
    "fileName" TEXT,
    "rawPath" TEXT,
    "details" JSONB,

    CONSTRAINT "SdiNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StampDutyPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "computedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(14,2),
    "dueDate" DATE NOT NULL,
    "effectiveDueDate" DATE,
    "f24Id" TEXT,
    "paidOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StampDutyPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalRuleSet" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RuleSetStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "notes" TEXT,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "RuleSourceKind" NOT NULL,
    "parser" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "checkIntervalHours" INTEGER NOT NULL DEFAULT 168,
    "lastHash" TEXT,
    "lastModified" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastSnapshotPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleChangeProposal" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetYear" INTEGER NOT NULL,
    "ruleSetId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotBeforePath" TEXT,
    "snapshotAfterPath" TEXT,
    "diff" TEXT,
    "extractedValues" JSONB NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    CONSTRAINT "RuleChangeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReturn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "collectedRevenue" DECIMAL(14,2) NOT NULL,
    "coefficient" DECIMAL(5,2) NOT NULL,
    "grossIncome" DECIMAL(14,2) NOT NULL,
    "contributionsPaid" DECIMAL(14,2) NOT NULL,
    "contributionsDeducted" DECIMAL(14,2) NOT NULL,
    "netIncome" DECIMAL(14,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "substituteTax" DECIMAL(14,2) NOT NULL,
    "previousCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previousCreditUsed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "advancesPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inpsTaxableIncome" DECIMAL(14,2) NOT NULL,
    "inpsRate" DECIMAL(5,2) NOT NULL,
    "inpsContributionDue" DECIMAL(14,2) NOT NULL,
    "inpsAdvancesPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inpsDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inpsCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "nextYearTaxAdvance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "nextYearInpsAdvance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ruleSetVersion" INTEGER,
    "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "filedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCredit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taxReturnId" TEXT,
    "kind" "TaxCreditKind" NOT NULL,
    "referenceYear" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "usableFrom" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCreditUsage" (
    "id" TEXT NOT NULL,
    "taxCreditId" TEXT NOT NULL,
    "f24LineId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxCreditUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentYear" INTEGER NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "kind" "InstallmentPlanKind" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "installments" INTEGER NOT NULL,
    "surchargePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "F24" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "F24Kind" NOT NULL,
    "paymentDate" DATE NOT NULL,
    "status" "F24Status" NOT NULL DEFAULT 'PLANNED',
    "planId" TEXT,
    "installmentNumber" INTEGER,
    "installmentsTotal" INTEGER,
    "totalDebit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "i24ScheduledAt" TIMESTAMP(3),
    "i24CancelBy" DATE,
    "paidOn" DATE,
    "taxNoticeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "F24_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "F24Line" (
    "id" TEXT NOT NULL,
    "f24Id" TEXT NOT NULL,
    "section" "F24Section" NOT NULL,
    "code" TEXT NOT NULL,
    "officeCode" TEXT,
    "installmentCode" TEXT,
    "periodFrom" TEXT,
    "periodTo" TEXT,
    "referenceYear" INTEGER NOT NULL,
    "debitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "F24Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "DeadlineKind" NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(14,2),
    "status" "DeadlineStatus" NOT NULL DEFAULT 'OPEN',
    "f24Id" TEXT,
    "ruleSetVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxNotice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "TaxNoticeKind" NOT NULL,
    "number" TEXT,
    "taxYear" INTEGER,
    "receivedOn" DATE NOT NULL,
    "amount" DECIMAL(14,2),
    "dueDate" DATE,
    "status" "TaxNoticeStatus" NOT NULL DEFAULT 'RECEIVED',
    "civisRequestId" TEXT,
    "civisRequestedOn" DATE,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantProfile_tenantId_key" ON "TenantProfile"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_date_idx" ON "Invoice"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_year_type_sequence_key" ON "Invoice"("tenantId", "year", "type", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_invoiceId_lineNumber_key" ON "InvoiceLine"("invoiceId", "lineNumber");

-- CreateIndex
CREATE INDEX "Payment_tenantId_date_idx" ON "Payment"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "SdiTransmission_invoiceId_idx" ON "SdiTransmission"("invoiceId");

-- CreateIndex
CREATE INDEX "SdiNotification_transmissionId_idx" ON "SdiNotification"("transmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "StampDutyPeriod_tenantId_year_quarter_key" ON "StampDutyPeriod"("tenantId", "year", "quarter");

-- CreateIndex
CREATE INDEX "FiscalRuleSet_year_status_idx" ON "FiscalRuleSet"("year", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalRuleSet_year_version_key" ON "FiscalRuleSet"("year", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSource_url_key" ON "RuleSource"("url");

-- CreateIndex
CREATE INDEX "RuleChangeProposal_status_targetYear_idx" ON "RuleChangeProposal"("status", "targetYear");

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturn_tenantId_year_key" ON "TaxReturn"("tenantId", "year");

-- CreateIndex
CREATE INDEX "TaxCredit_tenantId_kind_referenceYear_idx" ON "TaxCredit"("tenantId", "kind", "referenceYear");

-- CreateIndex
CREATE UNIQUE INDEX "TaxCreditUsage_f24LineId_key" ON "TaxCreditUsage"("f24LineId");

-- CreateIndex
CREATE INDEX "TaxCreditUsage_taxCreditId_idx" ON "TaxCreditUsage"("taxCreditId");

-- CreateIndex
CREATE INDEX "InstallmentPlan_tenantId_paymentYear_idx" ON "InstallmentPlan"("tenantId", "paymentYear");

-- CreateIndex
CREATE INDEX "F24_tenantId_paymentDate_idx" ON "F24"("tenantId", "paymentDate");

-- CreateIndex
CREATE INDEX "F24Line_f24Id_idx" ON "F24Line"("f24Id");

-- CreateIndex
CREATE INDEX "Deadline_tenantId_date_idx" ON "Deadline"("tenantId", "date");

-- CreateIndex
CREATE INDEX "TaxNotice_tenantId_receivedOn_idx" ON "TaxNotice"("tenantId", "receivedOn");

-- CreateIndex
CREATE INDEX "Attachment_tenantId_entityType_entityId_idx" ON "Attachment"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProfile" ADD CONSTRAINT "TenantProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_refInvoiceId_fkey" FOREIGN KEY ("refInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SdiTransmission" ADD CONSTRAINT "SdiTransmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SdiNotification" ADD CONSTRAINT "SdiNotification_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "SdiTransmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampDutyPeriod" ADD CONSTRAINT "StampDutyPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampDutyPeriod" ADD CONSTRAINT "StampDutyPeriod_f24Id_fkey" FOREIGN KEY ("f24Id") REFERENCES "F24"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalRuleSet" ADD CONSTRAINT "FiscalRuleSet_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleChangeProposal" ADD CONSTRAINT "RuleChangeProposal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RuleSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleChangeProposal" ADD CONSTRAINT "RuleChangeProposal_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "FiscalRuleSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleChangeProposal" ADD CONSTRAINT "RuleChangeProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCredit" ADD CONSTRAINT "TaxCredit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCredit" ADD CONSTRAINT "TaxCredit_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCreditUsage" ADD CONSTRAINT "TaxCreditUsage_taxCreditId_fkey" FOREIGN KEY ("taxCreditId") REFERENCES "TaxCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCreditUsage" ADD CONSTRAINT "TaxCreditUsage_f24LineId_fkey" FOREIGN KEY ("f24LineId") REFERENCES "F24Line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F24" ADD CONSTRAINT "F24_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F24" ADD CONSTRAINT "F24_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F24" ADD CONSTRAINT "F24_taxNoticeId_fkey" FOREIGN KEY ("taxNoticeId") REFERENCES "TaxNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F24Line" ADD CONSTRAINT "F24Line_f24Id_fkey" FOREIGN KEY ("f24Id") REFERENCES "F24"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_f24Id_fkey" FOREIGN KEY ("f24Id") REFERENCES "F24"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxNotice" ADD CONSTRAINT "TaxNotice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
