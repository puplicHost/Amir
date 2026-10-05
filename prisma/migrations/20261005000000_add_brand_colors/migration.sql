-- AlterTable: brand color customization (Level 1 admin settings)
ALTER TABLE "SiteSettings" ADD COLUMN "primaryDarkColor" TEXT NOT NULL DEFAULT '#285E8E',
                            ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#2B71AE',
                            ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#F5CC07';
