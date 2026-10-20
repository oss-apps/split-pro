-- Prisma cannot represent PostgreSQL INCLUDE indexes. Keep the same covering
-- access path with amount as the final key so future migrations retain it.
CREATE INDEX "ExpenseParticipant_userId_expenseId_amount_idx"
ON public."ExpenseParticipant" ("userId", "expenseId", amount);
DROP INDEX public."ExpenseParticipant_userId_expenseId_idx";
