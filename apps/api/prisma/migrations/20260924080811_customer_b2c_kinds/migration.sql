-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CustomerKind" ADD VALUE 'EU_B2C';
ALTER TYPE "CustomerKind" ADD VALUE 'NON_EU_B2C';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "art7SeptiesServices" BOOLEAN NOT NULL DEFAULT false;
