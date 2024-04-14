/*
  Warnings:

  - A unique constraint covering the columns `[splitwiseGroupId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Group_splitwiseGroupId_key" ON "Group"("splitwiseGroupId");
