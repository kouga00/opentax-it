-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "bankAccountId" TEXT,
ADD COLUMN     "paymentTermsId" TEXT;

-- AlterTable
ALTER TABLE "TenantProfile" DROP COLUMN "paymentBic",
DROP COLUMN "paymentIban",
DROP COLUMN "paymentMethod",
DROP COLUMN "paymentTermsDays";

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "iban" TEXT NOT NULL,
    "bic" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MP05',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_tenantId_name_key" ON "BankAccount"("tenantId", "name");

-- CreateIndex
CREATE INDEX "PaymentTerms_tenantId_idx" ON "PaymentTerms"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerms_tenantId_name_key" ON "PaymentTerms"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerms" ADD CONSTRAINT "PaymentTerms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "PaymentTerms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

