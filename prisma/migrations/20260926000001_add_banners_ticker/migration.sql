-- CreateTable: Banner (homepage banner management)
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "backgroundImagePath" TEXT,
    "buttonTextAr" TEXT,
    "buttonTextEn" TEXT,
    "buttonLinkType" TEXT,
    "buttonLinkValue" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'below_services',
    "widthPercent" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Banner_placement_isActive_sortOrder_idx" ON "Banner"("placement", "isActive", "sortOrder");

-- AlterTable: announcement ticker fields on singleton settings
ALTER TABLE "SiteSettings" ADD COLUMN "tickerTextAr" TEXT,
                            ADD COLUMN "tickerTextEn" TEXT,
                            ADD COLUMN "tickerActive" BOOLEAN NOT NULL DEFAULT false,
                            ADD COLUMN "tickerSpeed" INTEGER NOT NULL DEFAULT 30;
