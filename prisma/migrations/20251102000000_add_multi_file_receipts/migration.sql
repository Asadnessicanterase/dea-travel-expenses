-- AlterTable: Replace single receipt fields with array fields
ALTER TABLE "ExpenseClaim" DROP COLUMN "accommodationReceipt";
ALTER TABLE "ExpenseClaim" DROP COLUMN "transportationReceipt";
ALTER TABLE "ExpenseClaim" DROP COLUMN "otherReceipt";

ALTER TABLE "ExpenseClaim" ADD COLUMN "accommodationReceipts" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ExpenseClaim" ADD COLUMN "transportationReceipts" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ExpenseClaim" ADD COLUMN "otherReceipts" TEXT[] DEFAULT ARRAY[]::TEXT[];
