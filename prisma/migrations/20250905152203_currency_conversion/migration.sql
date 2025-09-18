/*
  Warnings:

  - A unique constraint covering the columns `[otherConversion]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SplitType" ADD VALUE 'CURRENCY_CONVERSION';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "otherConversion" TEXT;

-- CreateTable
CREATE UNLOGGED TABLE "CurrencyRateCache" (
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "insertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRateCache_pkey" PRIMARY KEY ("from","to","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_otherConversion_key" ON "Expense"("otherConversion");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_otherConversion_fkey" FOREIGN KEY ("otherConversion") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
