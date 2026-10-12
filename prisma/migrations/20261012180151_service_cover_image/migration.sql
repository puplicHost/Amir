/*
  Warnings:

  - You are about to drop the `ServiceSectionImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "coverImagePath" TEXT;

-- DropTable
DROP TABLE "ServiceSectionImage";
