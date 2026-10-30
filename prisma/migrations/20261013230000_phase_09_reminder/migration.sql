-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "whatsappReminder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "reminderLeadMin" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "reminderEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
