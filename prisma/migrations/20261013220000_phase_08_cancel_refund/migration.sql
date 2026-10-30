-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "refundStatus" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "BookingRefund" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "initiatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingRefund_idempotencyKey_key" ON "BookingRefund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BookingRefund_bookingId_idx" ON "BookingRefund"("bookingId");

-- CreateIndex
CREATE INDEX "BookingRefund_status_idx" ON "BookingRefund"("status");

-- AddForeignKey
ALTER TABLE "BookingRefund" ADD CONSTRAINT "BookingRefund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
