-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "settlementAllocationVersion" INTEGER;

-- CreateTable
CREATE TABLE "SettlementAllocation" (
    "settlementExpenseId" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "friendId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementAllocation_pkey" PRIMARY KEY ("settlementExpenseId", "groupId", "currency", "friendId", "userId")
);

-- CreateIndex
CREATE INDEX "SettlementAllocation_groupId_currency_friendId_userId_idx" ON "SettlementAllocation"("groupId", "currency", "friendId", "userId");

-- AddForeignKey
-- groupId intentionally has no foreign key so deleting a settled group keeps settlement provenance.
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_settlementExpenseId_fkey" FOREIGN KEY ("settlementExpenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
