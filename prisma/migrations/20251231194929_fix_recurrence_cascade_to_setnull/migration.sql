-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_recurrenceId_fkey";

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "ExpenseRecurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
