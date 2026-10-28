/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "quotations_verificationToken_key" ON "quotations"("verificationToken");
