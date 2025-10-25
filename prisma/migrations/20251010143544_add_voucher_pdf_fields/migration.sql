-- AlterTable
ALTER TABLE "ExpenseClaim" ADD COLUMN     "voucherGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "voucherPdfPath" TEXT;
