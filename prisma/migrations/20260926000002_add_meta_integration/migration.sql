-- AlterTable: Meta Pixel + Conversions API fields on singleton settings
ALTER TABLE "SiteSettings" ADD COLUMN "metaPixelId" TEXT,
                            ADD COLUMN "metaCapiToken" TEXT,
                            ADD COLUMN "metaTestEventCode" TEXT,
                            ADD COLUMN "metaEnabled" BOOLEAN NOT NULL DEFAULT false;
