-- CreateEnum
CREATE TYPE "F24LineRole" AS ENUM ('BALANCE', 'FIRST_ADVANCE', 'SECOND_ADVANCE', 'INTEREST', 'CREDIT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "F24Section" ADD VALUE 'REGIONAL';
ALTER TYPE "F24Section" ADD VALUE 'LOCAL';

-- AlterTable
ALTER TABLE "F24Line" ADD COLUMN     "localCode" TEXT,
ADD COLUMN     "role" "F24LineRole" NOT NULL DEFAULT 'OTHER';

