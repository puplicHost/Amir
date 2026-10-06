-- AlterTable Order: stock deduction flag for Delivered orders
ALTER TABLE "Order" ADD COLUMN "stockDeducted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable AdminUser: job title + confidential monthly salary
ALTER TABLE "AdminUser" ADD COLUMN "title" TEXT,
  ADD COLUMN "salary" DECIMAL(10,2);

-- CreateIndex Product.stock for inventory filtering/sorting
CREATE INDEX "Product_stock_idx" ON "Product"("stock");
