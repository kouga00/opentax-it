-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN     "paymentBic" TEXT,
ADD COLUMN     "paymentIban" TEXT,
ADD COLUMN     "paymentMethod" TEXT DEFAULT 'MP05',
ADD COLUMN     "paymentTermsDays" INTEGER;
