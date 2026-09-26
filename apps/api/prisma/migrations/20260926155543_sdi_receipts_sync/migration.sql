-- AlterTable
ALTER TABLE "SdiNotification" ADD COLUMN     "dedupeKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SdiTransmission" ADD COLUMN     "pecProviderId" TEXT;

-- CreateTable
CREATE TABLE "PecMailboxState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uidValidity" BIGINT,
    "lastUid" BIGINT,
    "syncStartedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PecMailboxState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PecMailboxState_tenantId_key" ON "PecMailboxState"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SdiNotification_transmissionId_dedupeKey_key" ON "SdiNotification"("transmissionId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "PecMailboxState" ADD CONSTRAINT "PecMailboxState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

