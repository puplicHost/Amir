-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "heroSlideIntervalSec" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroSlide_isActive_sortOrder_idx" ON "HeroSlide"("isActive", "sortOrder");

-- Backfill: keep today's single homepage hero image as slide 1 (active, sortOrder 0).
-- Touches data ONLY when SiteSettings(id=1).heroImagePath is set; otherwise inserts nothing.
-- The legacy heroImagePath column is left in place (a later cleanup can remove it).
INSERT INTO "HeroSlide" ("id", "imagePath", "altText", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'hero-' || substr(md5(random()::text), 1, 20), "heroImagePath", NULL, 0, true, NOW(), NOW()
FROM "SiteSettings" WHERE "id" = 1 AND "heroImagePath" IS NOT NULL;
