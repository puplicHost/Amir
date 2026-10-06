-- AlterTable Service
ALTER TABLE "Service" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Service_isFeatured_idx" ON "Service"("isFeatured");

-- AlterTable Banner
ALTER TABLE "Banner" ADD COLUMN "backgroundColor" TEXT,
                     ADD COLUMN "textColor" TEXT;

-- CreateTable AnnouncementItem
CREATE TABLE "AnnouncementItem" (
    "id" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "textEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "linkType" TEXT NOT NULL DEFAULT 'none',
    "linkValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnnouncementItem_isActive_sortOrder_idx" ON "AnnouncementItem"("isActive", "sortOrder");

-- AlterTable SiteSettings
ALTER TABLE "SiteSettings" ADD COLUMN "offerEndDate" TIMESTAMP(3),
                            ADD COLUMN "announcementActive" BOOLEAN NOT NULL DEFAULT true,
                            ADD COLUMN "announcementBgColor" TEXT NOT NULL DEFAULT '#2B71AE';
