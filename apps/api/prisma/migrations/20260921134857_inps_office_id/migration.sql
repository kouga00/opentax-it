/*
  Warnings:

  - You are about to drop the column `inpsOfficeCode` on the `TenantProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TenantProfile" DROP COLUMN "inpsOfficeCode",
ADD COLUMN     "inpsOfficeId" TEXT;
