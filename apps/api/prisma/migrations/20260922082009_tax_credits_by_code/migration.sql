-- AlterEnum
ALTER TYPE "F24Kind" ADD VALUE 'COMPENSATION';

-- DropIndex
DROP INDEX "TaxCredit_tenantId_kind_referenceYear_idx";

-- AlterTable
ALTER TABLE "TaxCredit" DROP COLUMN "kind",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "installmentCode" TEXT,
ADD COLUMN     "localCode" TEXT,
ADD COLUMN     "section" "F24Section" NOT NULL;

-- DropEnum
DROP TYPE "TaxCreditKind";

-- CreateIndex
CREATE INDEX "TaxCredit_tenantId_section_referenceYear_idx" ON "TaxCredit"("tenantId", "section", "referenceYear");

