-- AlterTable: AdminUser (phone)
ALTER TABLE "AdminUser" ADD COLUMN "phone" TEXT;

-- AlterTable: QuoteRequest (discount, subtotal, bilingual PDF paths, account rep info)
ALTER TABLE "QuoteRequest" ADD COLUMN "subtotalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
                           ADD COLUMN "discountType" TEXT DEFAULT 'none',
                           ADD COLUMN "discountValue" DECIMAL(10,2) DEFAULT 0,
                           ADD COLUMN "discountAmount" DECIMAL(10,2) DEFAULT 0,
                           ADD COLUMN "pdfPathEn" TEXT,
                           ADD COLUMN "pdfPathAr" TEXT,
                           ADD COLUMN "accountRepEmail" TEXT,
                           ADD COLUMN "accountRepPhone" TEXT;

-- AlterTable: QuoteRequestItem (bilingual snapshots, custom item flag, image, notes)
ALTER TABLE "QuoteRequestItem" ADD COLUMN "productNameArSnapshot" TEXT,
                               ADD COLUMN "productNameEnSnapshot" TEXT,
                               ADD COLUMN "imagePath" TEXT,
                               ADD COLUMN "notes" TEXT,
                               ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: SiteSettings (configurable quote terms & conditions)
ALTER TABLE "SiteSettings" ADD COLUMN "quoteTermsAr" TEXT,
                            ADD COLUMN "quoteTermsEn" TEXT;
