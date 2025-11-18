/*
  Warnings:

  - You are about to drop the `Balance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupBalance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Balance" DROP CONSTRAINT "Balance_friendId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Balance" DROP CONSTRAINT "Balance_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupBalance" DROP CONSTRAINT "GroupBalance_firendId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupBalance" DROP CONSTRAINT "GroupBalance_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupBalance" DROP CONSTRAINT "GroupBalance_userId_fkey";

-- DropTable
DROP TABLE "public"."Balance";

-- DropTable
DROP TABLE "public"."GroupBalance";
