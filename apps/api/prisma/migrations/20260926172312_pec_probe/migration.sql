-- AlterTable
ALTER TABLE "PecMailboxState" ADD COLUMN     "probeMessageId" TEXT,
ADD COLUMN     "probeRecipient" TEXT,
ADD COLUMN     "probeSentAt" TIMESTAMP(3);

