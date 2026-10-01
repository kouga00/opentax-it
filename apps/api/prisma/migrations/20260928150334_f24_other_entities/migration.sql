-- AlterEnum
ALTER TYPE "F24LineRole" ADD VALUE 'CONTRIBUTION';

-- AlterEnum
ALTER TYPE "F24Section" ADD VALUE 'OTHER_ENTITY';

-- AlterTable
ALTER TABLE "F24Line" ADD COLUMN     "deductibleAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "entityCode" TEXT,
ADD COLUMN     "positionCode" TEXT;

