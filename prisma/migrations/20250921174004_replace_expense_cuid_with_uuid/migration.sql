/*
  Warnings:

  - The primary key for the `Expense` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuidId` on the `Expense` table. All the data in the column will be lost.
  - The `id` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `expenseUuid` on the `ExpenseNote` table. All the data in the column will be lost.
  - The primary key for the `ExpenseParticipant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `expenseUuid` on the `ExpenseParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `expenseUuid` on the `ExpenseRecurrence` table. All the data in the column will be lost.
  - Changed the type of `expenseId` on the `ExpenseNote` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `expenseId` on the `ExpenseParticipant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `expenseId` on the `ExpenseRecurrence` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_otherConversion_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseNote" DROP CONSTRAINT "ExpenseNote_expenseUuid_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseParticipant" DROP CONSTRAINT "ExpenseParticipant_expenseUuid_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseRecurrence" DROP CONSTRAINT "ExpenseRecurrence_expenseUuid_fkey";

-- DropIndex
DROP INDEX "public"."Expense_uuidId_key";

-- DropIndex
DROP INDEX "public"."ExpenseRecurrence_expenseUuid_key";

-- AlterTable: Expense - Drop primary key constraint first
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_pkey";

-- AlterTable: Expense - Drop the old id column
ALTER TABLE "public"."Expense" DROP COLUMN "id";

-- AlterTable: Expense - Rename uuidId to id
ALTER TABLE "public"."Expense" RENAME COLUMN "uuidId" TO "id";

-- AlterTable: Expense - Add primary key constraint
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_pkey" PRIMARY KEY ("id");

-- AlterTable: ExpenseNote - Drop old expenseId column
ALTER TABLE "public"."ExpenseNote" DROP COLUMN "expenseId";

-- AlterTable: ExpenseNote - Rename expenseUuid to expenseId
ALTER TABLE "public"."ExpenseNote" RENAME COLUMN "expenseUuid" TO "expenseId";

-- AlterTable: ExpenseParticipant - Drop primary key constraint first
ALTER TABLE "public"."ExpenseParticipant" DROP CONSTRAINT "ExpenseParticipant_pkey";

-- AlterTable: ExpenseParticipant - Drop old expenseId column
ALTER TABLE "public"."ExpenseParticipant" DROP COLUMN "expenseId";

-- AlterTable: ExpenseParticipant - Rename expenseUuid to expenseId
ALTER TABLE "public"."ExpenseParticipant" RENAME COLUMN "expenseUuid" TO "expenseId";

-- AlterTable: ExpenseParticipant - Add primary key constraint
ALTER TABLE "public"."ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_pkey" PRIMARY KEY ("expenseId", "userId");

-- AlterTable: ExpenseRecurrence - Drop old expenseId column
ALTER TABLE "public"."ExpenseRecurrence" DROP COLUMN "expenseId";

-- AlterTable: ExpenseRecurrence - Rename expenseUuid to expenseId
ALTER TABLE "public"."ExpenseRecurrence" RENAME COLUMN "expenseUuid" TO "expenseId";

-- AlterTable
ALTER TABLE "public"."ExpenseNote" ALTER COLUMN "expenseId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."ExpenseRecurrence" ALTER COLUMN "expenseId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecurrence_expenseId_key" ON "public"."ExpenseRecurrence"("expenseId");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_otherConversion_fkey" FOREIGN KEY ("otherConversion") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseNote" ADD CONSTRAINT "ExpenseNote_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecurrence" ADD CONSTRAINT "ExpenseRecurrence_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;