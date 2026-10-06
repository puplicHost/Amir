-- AlterTable Product: inventory tracking fields
ALTER TABLE "Product" ADD COLUMN "costPrice" DECIMAL(10,2),
  ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 5;

-- AlterTable OrderItem: cost snapshot for COGS
ALTER TABLE "OrderItem" ADD COLUMN "productCostSnapshot" DECIMAL(10,2);

-- AlterTable QuoteRequest: governorate, expiry, custom terms, admin notes
ALTER TABLE "QuoteRequest" ADD COLUMN "governorate" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "customTermsAr" TEXT,
  ADD COLUMN "customTermsEn" TEXT,
  ADD COLUMN "useDefaultTerms" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "adminNotes" TEXT;

-- AlterTable SiteSettings: quote/invoice sequencing + terms audit
ALTER TABLE "SiteSettings" ADD COLUMN "quoteTermsUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "quoteTermsUpdatedBy" TEXT,
  ADD COLUMN "quoteSequenceNext" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "quoteAutoMessage" TEXT,
  ADD COLUMN "invoiceSequenceNext" INTEGER NOT NULL DEFAULT 1;

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "userId" TEXT,
  "userName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateTable Invoice
CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerGovernorat" TEXT,
  "customerAddress" TEXT,
  "notes" TEXT,
  "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "subtotalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "type" TEXT NOT NULL DEFAULT 'manual',
  "orderId" TEXT,
  "quoteId" TEXT,
  "createdById" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE UNIQUE INDEX "Invoice_quoteId_key" ON "Invoice"("quoteId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateTable InvoiceItem
CREATE TABLE "InvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateTable Employee
CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "salary" DECIMAL(10,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateTable Expense
CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "recurring" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Expense_year_month_idx" ON "Expense"("year", "month");

-- AddForeignKey Invoice -> Order / QuoteRequest / InvoiceItem -> Invoice
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
