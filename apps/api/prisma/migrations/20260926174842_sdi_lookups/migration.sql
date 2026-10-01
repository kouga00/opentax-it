-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_xmlFileName_key" ON "Invoice"("tenantId", "xmlFileName");

-- CreateIndex
CREATE INDEX "SdiTransmission_fileName_idx" ON "SdiTransmission"("fileName");

-- CreateIndex
CREATE INDEX "SdiTransmission_pecMessageId_idx" ON "SdiTransmission"("pecMessageId");

