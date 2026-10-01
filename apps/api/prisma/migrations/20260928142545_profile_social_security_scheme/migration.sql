-- CreateEnum
CREATE TYPE "SocialSecurityScheme" AS ENUM ('INPS_SEPARATE', 'INPS_ARTISANS', 'INPS_TRADERS', 'PROFESSIONAL_FUND');

-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN     "socialSecurityScheme" "SocialSecurityScheme" NOT NULL DEFAULT 'INPS_SEPARATE';

