/*
  Warnings:

  - The `otherConversion` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[uuidId]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[expenseUuid]` on the table `ExpenseRecurrence` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_otherConversion_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseNote" DROP CONSTRAINT "ExpenseNote_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseParticipant" DROP CONSTRAINT "ExpenseParticipant_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseRecurrence" DROP CONSTRAINT "ExpenseRecurrence_expenseId_fkey";

-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "uuidId" UUID DEFAULT gen_random_uuid(),
DROP COLUMN "otherConversion",
ADD COLUMN     "otherConversion" UUID;

-- AlterTable
ALTER TABLE "public"."ExpenseNote" ADD COLUMN     "expenseUuid" UUID;

-- AlterTable
ALTER TABLE "public"."ExpenseParticipant" ADD COLUMN     "expenseUuid" UUID;

-- AlterTable
ALTER TABLE "public"."ExpenseRecurrence" ADD COLUMN     "expenseUuid" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_uuidId_key" ON "public"."Expense"("uuidId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_otherConversion_key" ON "public"."Expense"("otherConversion");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecurrence_expenseUuid_key" ON "public"."ExpenseRecurrence"("expenseUuid");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_otherConversion_fkey" FOREIGN KEY ("otherConversion") REFERENCES "public"."Expense"("uuidId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_expenseUuid_fkey" FOREIGN KEY ("expenseUuid") REFERENCES "public"."Expense"("uuidId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseNote" ADD CONSTRAINT "ExpenseNote_expenseUuid_fkey" FOREIGN KEY ("expenseUuid") REFERENCES "public"."Expense"("uuidId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecurrence" ADD CONSTRAINT "ExpenseRecurrence_expenseUuid_fkey" FOREIGN KEY ("expenseUuid") REFERENCES "public"."Expense"("uuidId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate data
UPDATE "public"."Expense" SET "uuidId" = gen_random_uuid() WHERE "uuidId" IS NULL;
UPDATE "public"."ExpenseParticipant" SET "expenseUuid" = (SELECT "uuidId" FROM "public"."Expense" WHERE "id" = "expenseId") WHERE "expenseUuid" IS NULL;
UPDATE "public"."ExpenseNote" SET "expenseUuid" = (SELECT "uuidId" FROM "public"."Expense" WHERE "id" = "expenseId") WHERE "expenseUuid" IS NULL;
