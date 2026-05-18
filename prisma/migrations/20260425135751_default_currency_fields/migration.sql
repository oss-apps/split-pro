-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "defaultCurrency" DROP NOT NULL,
ALTER COLUMN "defaultCurrency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultCurrency" TEXT;
