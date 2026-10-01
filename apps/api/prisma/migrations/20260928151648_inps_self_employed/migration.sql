-- AlterTable
ALTER TABLE "TaxYearData" ADD COLUMN     "inpsExcessCode" TEXT,
ADD COLUMN     "inpsFixedCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN     "inpsFlatRateReduction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inpsSeniorityBefore1996" BOOLEAN NOT NULL DEFAULT false;

