-- CreateTable
CREATE UNLOGGED TABLE "ExchangeRateCache" (
    "currencyFrom" TEXT NOT NULL,
    "currencyTo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "insertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateCache_pkey" PRIMARY KEY ("currencyFrom","currencyTo","date")
);
