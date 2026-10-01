-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "sequence" DROP NOT NULL;

-- Drafts have no progressive number until they are issued.
UPDATE "Invoice" SET "sequence" = NULL WHERE "status" = 'DRAFT';
