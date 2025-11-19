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
