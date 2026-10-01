-- Payment terms with several installments and the "fine mese" option: the single number of days becomes the first installment.
ALTER TABLE "PaymentTerms" ADD COLUMN "dueDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "fromMonthEnd" BOOLEAN NOT NULL DEFAULT false;
UPDATE "PaymentTerms" SET "dueDays" = ARRAY["days"];
ALTER TABLE "PaymentTerms" DROP COLUMN "days";
