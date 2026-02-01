-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "recurrenceId" INTEGER;

-- CreateTable
CREATE TABLE "public"."ExpenseRecurrence" (
    "id" SERIAL NOT NULL,
    "jobId" BIGINT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExpenseRecurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecurrence_jobId_key" ON "public"."ExpenseRecurrence"("jobId");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "public"."ExpenseRecurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
    -- STEP 3: Set notified to false in the ExpenseRecurrence table
    UPDATE "ExpenseRecurrence"
    SET notified = false
    WHERE id = (SELECT "recurrenceId" FROM "Expense" WHERE id = original_expense_id);
    -- STEP 4: Return the new expense ID
    RETURN new_expense_id;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
IF current_database() NOT LIKE 'prisma_migrate_shadow_db%' THEN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
ELSE
    CREATE SCHEMA IF NOT EXISTS cron;
    CREATE TABLE IF NOT EXISTS cron.job (
        jobid BIGINT PRIMARY KEY,
        schedule TEXT,
        command TEXT,
        nodename TEXT,
        nodeport INTEGER,
        database TEXT,
        username TEXT,
        active BOOLEAN,
        jobname TEXT
    );
END IF;
END $$;

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecurrence" ADD CONSTRAINT "ExpenseRecurrence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "cron"."job"("jobid") ON DELETE CASCADE ON UPDATE CASCADE;