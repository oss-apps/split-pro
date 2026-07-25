-- CreateTable
CREATE TABLE "ExpenseRating" (
    "expenseId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseRating_pkey" PRIMARY KEY ("expenseId","userId")
);

-- CreateIndex
CREATE INDEX "ExpenseRating_userId_idx" ON "ExpenseRating"("userId");

-- AddForeignKey
ALTER TABLE "ExpenseRating" ADD CONSTRAINT "ExpenseRating_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRating" ADD CONSTRAINT "ExpenseRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

