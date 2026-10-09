-- Add refund reason code to Order (nullable; set when an order is marked Refunded)
ALTER TABLE "Order" ADD COLUMN "refundReason" TEXT;
