-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "replacesInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_replacesInvoiceId_key" ON "Invoice"("replacesInvoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_replacesInvoiceId_fkey" FOREIGN KEY ("replacesInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

