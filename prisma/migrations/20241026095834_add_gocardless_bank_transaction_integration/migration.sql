-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gocardlessBankId" TEXT,
ADD COLUMN     "gocardlessId" TEXT;

-- CreateTable
CREATE TABLE "CachedBankData" (
    "id" SERIAL NOT NULL,
    "gocardlessId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastFetched" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedBankData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CachedBankData_gocardlessId_key" ON "CachedBankData"("gocardlessId");
