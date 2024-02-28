-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" INTEGER;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
