-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fbp" TEXT,
ADD COLUMN "fbc" TEXT;
