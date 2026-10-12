-- Add featuredOnHomepage flag to Service (mirrors Category.featuredOnHomepage).
-- Homepage shows featured services; admin toggles per service like categories.
ALTER TABLE "Service" ADD COLUMN "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Service_featuredOnHomepage_idx" ON "Service"("featuredOnHomepage");
