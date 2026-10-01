-- DropForeignKey
ALTER TABLE "F24" DROP CONSTRAINT "F24_planId_fkey";

-- DropIndex
DROP INDEX "InstallmentPlan_tenantId_paymentYear_idx";

-- AlterTable
ALTER TABLE "F24Line" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "InstallmentPlan" DROP COLUMN "amount",
DROP COLUMN "kind",
ADD COLUMN     "inpsBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "inpsFirstAdvance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "inpsSecondAdvance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ruleSetVersion" INTEGER,
ADD COLUMN     "taxBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxFirstAdvance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxSecondAdvance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "InstallmentPlanKind";

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_tenantId_taxYear_key" ON "InstallmentPlan"("tenantId", "taxYear");

-- AddForeignKey
ALTER TABLE "F24" ADD CONSTRAINT "F24_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

