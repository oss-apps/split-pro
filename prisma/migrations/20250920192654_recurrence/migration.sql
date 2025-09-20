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
