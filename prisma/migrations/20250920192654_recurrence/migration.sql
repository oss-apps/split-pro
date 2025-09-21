-- CreateEnum
CREATE TYPE "public"."RecurrenceInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "recurrenceId" INTEGER;

-- CreateTable
CREATE TABLE "public"."ExpenseRecurrence" (
    "id" SERIAL NOT NULL,
    "expenseId" TEXT NOT NULL,
    "repeatEvery" INTEGER NOT NULL,
    "repeatInterval" "public"."RecurrenceInterval" NOT NULL,
    "createdById" INTEGER NOT NULL,
    "jobId" BIGINT NOT NULL,

    CONSTRAINT "ExpenseRecurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecurrence_expenseId_key" ON "public"."ExpenseRecurrence"("expenseId");

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecurrence" ADD CONSTRAINT "ExpenseRecurrence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecurrence" ADD CONSTRAINT "ExpenseRecurrence_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION duplicate_expense_with_participants(original_expense_id UUID)
RETURNS UUID AS $$
DECLARE
    new_expense_id UUID;
BEGIN
    -- STEP 1: Insert the new expense and get its new ID
    INSERT INTO "Expense" (
        "paidBy", "addedBy", name, category, amount, "splitType", "expenseDate", "updatedAt",
        currency, "groupId", "updatedBy", "recurrenceId"
    )
    SELECT
        "paidBy", "addedBy", name, category, amount, "splitType", now(), now(),
        currency, "groupId", "updatedBy", "recurrenceId"
    FROM "Expense"
    WHERE id = original_expense_id
    RETURNING id INTO new_expense_id;

    -- STEP 2: Insert the new expense participants
    INSERT INTO "ExpenseParticipant" (
        "expenseId", "userId", amount
    )
    SELECT
        new_expense_id, "userId", amount
    FROM "ExpenseParticipant"
    WHERE "expenseId" = original_expense_id;

    -- STEP 3: Return the new expense ID
    RETURN new_expense_id;
END;
$$ LANGUAGE plpgsql;