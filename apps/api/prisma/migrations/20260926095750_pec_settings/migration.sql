/*
  Warnings:

  - You are about to drop the column `pecCredentialsEnc` on the `TenantProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TenantProfile" DROP COLUMN "pecCredentialsEnc",
ADD COLUMN     "pecImapHost" TEXT,
ADD COLUMN     "pecImapPort" INTEGER,
ADD COLUMN     "pecPasswordEnc" TEXT,
ADD COLUMN     "pecProvider" TEXT,
ADD COLUMN     "pecSmtpHost" TEXT,
ADD COLUMN     "pecSmtpPort" INTEGER,
ADD COLUMN     "pecUsername" TEXT;
