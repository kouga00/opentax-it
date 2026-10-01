-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentMethod" TEXT;

-- Drafts take the method of their payment terms, or of the tenant default terms.
-- Issued documents keep NULL: their method is in the stored XML (DatiPagamento/ModalitaPagamento).
UPDATE "Invoice" i
SET "paymentMethod" = t."method"
FROM "PaymentTerms" t
WHERE i."status" = 'DRAFT'
  AND t."tenantId" = i."tenantId"
  AND t."id" = COALESCE(
    i."paymentTermsId",
    (SELECT d."id" FROM "PaymentTerms" d WHERE d."tenantId" = i."tenantId" AND d."isDefault" ORDER BY d."createdAt" LIMIT 1)
  );
