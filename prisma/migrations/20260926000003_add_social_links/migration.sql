-- AlterTable: extra social profile URL fields (all optional)
ALTER TABLE "SiteSettings" ADD COLUMN "socialTiktok" TEXT,
                            ADD COLUMN "socialYoutube" TEXT,
                            ADD COLUMN "socialLinkedin" TEXT,
                            ADD COLUMN "socialX" TEXT;
