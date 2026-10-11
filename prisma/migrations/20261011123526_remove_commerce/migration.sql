/*
  Warnings:

  - You are about to drop the column `compareAtPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceSequenceNext` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentCodEnabled` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentGatewayCredentials` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentGatewayMode` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentGatewayName` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentOnlineEnabled` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteAutoMessage` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteSequenceNext` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteTermsAr` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteTermsEn` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteTermsUpdatedAt` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteTermsUpdatedBy` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteValidityDays` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the `CustomerAccessToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderStatusHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteRequestItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceFormField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRequestAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRequestValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockMovement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "OrderStatusHistory" DROP CONSTRAINT "OrderStatusHistory_changedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OrderStatusHistory" DROP CONSTRAINT "OrderStatusHistory_orderId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteRequestItem" DROP CONSTRAINT "QuoteRequestItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteRequestItem" DROP CONSTRAINT "QuoteRequestItem_quoteRequestId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceFormField" DROP CONSTRAINT "ServiceFormField_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequestAttachment" DROP CONSTRAINT "ServiceRequestAttachment_requestId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequestValue" DROP CONSTRAINT "ServiceRequestValue_requestId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_productId_fkey";

-- DropIndex
DROP INDEX "Product_stock_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "compareAtPrice",
DROP COLUMN "costPrice",
DROP COLUMN "minStock",
DROP COLUMN "stock";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "cardColor" TEXT,
ADD COLUMN     "iconName" TEXT,
ADD COLUMN     "tagAr" TEXT,
ADD COLUMN     "tagEn" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "invoiceSequenceNext",
DROP COLUMN "paymentCodEnabled",
DROP COLUMN "paymentGatewayCredentials",
DROP COLUMN "paymentGatewayMode",
DROP COLUMN "paymentGatewayName",
DROP COLUMN "paymentOnlineEnabled",
DROP COLUMN "quoteAutoMessage",
DROP COLUMN "quoteSequenceNext",
DROP COLUMN "quoteTermsAr",
DROP COLUMN "quoteTermsEn",
DROP COLUMN "quoteTermsUpdatedAt",
DROP COLUMN "quoteTermsUpdatedBy",
DROP COLUMN "quoteValidityDays",
ALTER COLUMN "siteNameAr" SET DEFAULT 'أمير',
ALTER COLUMN "siteNameEn" SET DEFAULT 'Amir';

-- DropTable
DROP TABLE "CustomerAccessToken";

-- DropTable
DROP TABLE "Expense";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceItem";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "OrderStatusHistory";

-- DropTable
DROP TABLE "QuoteRequest";

-- DropTable
DROP TABLE "QuoteRequestItem";

-- DropTable
DROP TABLE "ServiceFormField";

-- DropTable
DROP TABLE "ServiceRequest";

-- DropTable
DROP TABLE "ServiceRequestAttachment";

-- DropTable
DROP TABLE "ServiceRequestValue";

-- DropTable
DROP TABLE "StockMovement";

-- CreateTable
CREATE TABLE "ProductVideo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'pdf',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVideo_productId_key" ON "ProductVideo"("productId");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_idx" ON "ProductDocument"("productId");

-- CreateIndex
CREATE INDEX "ContactMessage_isRead_createdAt_idx" ON "ContactMessage"("isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductVideo" ADD CONSTRAINT "ProductVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
