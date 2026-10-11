/*
  Warnings:

  - You are about to drop the column `cardColor` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionAr` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionEn` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `iconName` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `iconPath` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `nameAr` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `nameEn` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `tagAr` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `tagEn` on the `Service` table. All the data in the column will be lost.
  - Added the required column `name` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceAbCents` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Made the column `slug` on table `Service` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ServiceSection" AS ENUM ('DAMEN', 'HERREN', 'KINDER', 'KOSMETIK');

-- DropIndex
DROP INDEX "Service_isActive_idx";

-- DropIndex
DROP INDEX "Service_isFeatured_idx";

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "cardColor",
DROP COLUMN "descriptionAr",
DROP COLUMN "descriptionEn",
DROP COLUMN "iconName",
DROP COLUMN "iconPath",
DROP COLUMN "isFeatured",
DROP COLUMN "nameAr",
DROP COLUMN "nameEn",
DROP COLUMN "tagAr",
DROP COLUMN "tagEn",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "durationMin" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "needsDurationReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceAbCents" INTEGER NOT NULL,
ADD COLUMN     "section" "ServiceSection" NOT NULL,
ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "depositPercent" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "holdTtlMin" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "paypalClientId" TEXT,
ADD COLUMN     "paypalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paypalMode" TEXT NOT NULL DEFAULT 'sandbox',
ADD COLUMN     "paypalSecret" TEXT,
ADD COLUMN     "paypalWebhookId" TEXT,
ADD COLUMN     "slotStepMin" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePublishableKey" TEXT,
ADD COLUMN     "stripeSecretKey" TEXT,
ADD COLUMN     "stripeWebhookSecret" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
ADD COLUMN     "whatsappNumber" TEXT,
ALTER COLUMN "defaultCurrency" SET DEFAULT 'EUR';

-- CreateTable
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "openMin" INTEGER NOT NULL,
    "closeMin" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinSnapshot" INTEGER NOT NULL,
    "priceSnapshotCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "assignedStaffId" TEXT,
    "notes" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "BookingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_weekday_key" ON "WorkingHours"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_providerRef_key" ON "Booking"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_serviceId_startsAt_idx" ON "Booking"("serviceId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_assignedStaffId_startsAt_idx" ON "Booking"("assignedStaffId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_holdExpiresAt_idx" ON "Booking"("holdExpiresAt");

-- CreateIndex
CREATE INDEX "BookingAssignment_bookingId_idx" ON "BookingAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAssignment_staffId_idx" ON "BookingAssignment"("staffId");

-- CreateIndex
CREATE INDEX "Service_section_isActive_sortOrder_idx" ON "Service"("section", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
