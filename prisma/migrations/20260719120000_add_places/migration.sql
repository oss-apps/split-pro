-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "placeId" TEXT;

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Place_createdById_idx" ON "Place"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Place_createdById_name_key" ON "Place"("createdById", "name");

-- CreateIndex
CREATE INDEX "Expense_placeId_idx" ON "Expense"("placeId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

