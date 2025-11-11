/*
  Warnings:

  - You are about to drop the `ExpenseNote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ExpenseNote" DROP CONSTRAINT "ExpenseNote_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseNote" DROP CONSTRAINT "ExpenseNote_expenseId_fkey";

-- DropTable
DROP TABLE "public"."ExpenseNote";

-- CreateTable
CREATE TABLE "public"."ExpenseComment" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expenseId" UUID NOT NULL,

    CONSTRAINT "ExpenseComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ExpenseComment" ADD CONSTRAINT "ExpenseComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseComment" ADD CONSTRAINT "ExpenseComment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
