-- B-tree lookup indexes for search and ownership-verification queries.
-- NOTE: Product.slug is already @unique (implicit b-tree index) and
-- Product has no `status` column (availability is `isActive`, already indexed).
CREATE INDEX IF NOT EXISTS "Product_nameAr_idx" ON "Product"("nameAr");
CREATE INDEX IF NOT EXISTS "Product_nameEn_idx" ON "Product"("nameEn");
CREATE INDEX IF NOT EXISTS "Order_customerPhone_idx" ON "Order"("customerPhone");
CREATE INDEX IF NOT EXISTS "QuoteRequest_phone_idx" ON "QuoteRequest"("phone");
