-- Substitute tax credit of the previous year closed by the return that absorbs it (LM43 − LM44, Redditi PF booklet 3).
ALTER TABLE "TaxCredit" ADD COLUMN "absorbedByReturnId" TEXT;

ALTER TABLE "TaxCredit" ADD CONSTRAINT "TaxCredit_absorbedByReturnId_fkey" FOREIGN KEY ("absorbedByReturnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
