-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "professionalFundContribution" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "professionalFundRatePct" DECIMAL(5,2),
ADD COLUMN     "professionalFundType" TEXT;

-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN     "professionalFundRatePct" DECIMAL(5,2),
ADD COLUMN     "professionalFundType" TEXT;

