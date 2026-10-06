-- AlterTable
ALTER TABLE "Service" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
