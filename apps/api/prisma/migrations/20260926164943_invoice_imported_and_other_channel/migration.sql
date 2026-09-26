-- AlterEnum
ALTER TYPE "SdiChannel" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "imported" BOOLEAN NOT NULL DEFAULT false;


-- Invoices imported before this column existed were stored under an "imported" folder (invoices-import.service.ts).
UPDATE "Invoice" SET "imported" = true WHERE "xmlPath" LIKE '%/imported/%';
