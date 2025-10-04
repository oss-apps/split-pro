-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankingId" TEXT,
ADD COLUMN     "obapiProviderId" TEXT;

-- CreateTable
CREATE TABLE "CachedBankData" (
    "id" SERIAL NOT NULL,
    "obapiProviderId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastFetched" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedBankData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CachedBankData_obapiProviderId_key" ON "CachedBankData"("obapiProviderId");

-- AddForeignKey
ALTER TABLE "public"."CachedBankData" ADD CONSTRAINT "CachedBankData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
