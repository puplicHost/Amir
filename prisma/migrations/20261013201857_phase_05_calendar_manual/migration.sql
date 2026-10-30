-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "manualHoldTtlMin" INTEGER NOT NULL DEFAULT 1440;
