-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'de',
ADD COLUMN     "manageToken" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "mailProvider" TEXT NOT NULL DEFAULT 'log',
ADD COLUMN     "mailFrom" TEXT,
ADD COLUMN     "mailFromName" TEXT,
ADD COLUMN     "mailHttpEndpoint" TEXT,
ADD COLUMN     "mailHttpKey" TEXT;

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "locale" TEXT NOT NULL DEFAULT 'de',
    "sendTo" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "ical" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "sendAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_manageToken_key" ON "Booking"("manageToken");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_dedupeKey_key" ON "NotificationOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_sendAfter_idx" ON "NotificationOutbox"("status", "sendAfter");

-- CreateIndex
CREATE INDEX "NotificationOutbox_bookingId_idx" ON "NotificationOutbox"("bookingId");

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
