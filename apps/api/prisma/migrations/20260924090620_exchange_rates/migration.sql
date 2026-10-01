-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "unitsPerEur" DECIMAL(18,6) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateDay" (
    "date" DATE NOT NULL,
    "records" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateDay_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_date_currency_key" ON "ExchangeRate"("date", "currency");
