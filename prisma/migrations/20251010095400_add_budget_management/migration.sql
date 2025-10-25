
-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "ExpenseClaim" ADD COLUMN     "actualAmount" DOUBLE PRECISION,
ADD COLUMN     "voucherNumber" TEXT;

-- AlterTable
ALTER TABLE "TravelRequest" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "cancelledReason" TEXT,
ADD COLUMN     "reservedAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "BudgetSettings" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetSettings_year_key" ON "BudgetSettings"("year");

-- CreateIndex
CREATE INDEX "BudgetSettings_year_idx" ON "BudgetSettings"("year");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClaim_voucherNumber_key" ON "ExpenseClaim"("voucherNumber");
