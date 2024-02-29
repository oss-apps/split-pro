-- AlterTable
ALTER TABLE "Balance" ADD COLUMN     "importedFromSplitWise" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "importedSplitwise" BOOLEAN NOT NULL DEFAULT false;
