/*
  Warnings:

  - A unique constraint covering the columns `[conversionToId]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SplitType" ADD VALUE 'CURRENCY_CONVERSION';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "conversionToId" TEXT;

-- CreateTable
CREATE UNLOGGED TABLE "public"."CachedCurrencyRate" (
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "lastFetched" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedCurrencyRate_pkey" PRIMARY KEY ("from","to","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_conversionToId_key" ON "Expense"("conversionToId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_conversionToId_fkey" FOREIGN KEY ("conversionToId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
