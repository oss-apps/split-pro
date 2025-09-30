/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `ExpenseRecurrence` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecurrence_jobId_key" ON "public"."ExpenseRecurrence"("jobId");

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecurrence" ADD CONSTRAINT "ExpenseRecurrence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "cron"."job"("jobid") ON DELETE CASCADE ON UPDATE CASCADE;
