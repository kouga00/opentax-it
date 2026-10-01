-- CreateTable
CREATE TABLE "TaxYearData" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "contributionsPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAdvancesPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inpsAdvancesPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxCredits" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inpsReducedRate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxYearData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxYearData_tenantId_year_key" ON "TaxYearData"("tenantId", "year");

-- AddForeignKey
ALTER TABLE "TaxYearData" ADD CONSTRAINT "TaxYearData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
