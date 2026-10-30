-- Marketing & tracking integrations. Additive only: no existing table,
-- column, row, or Meta configuration is modified or removed.

CREATE TABLE "MarketingIntegration" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "secrets" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingIntegration_platform_key" ON "MarketingIntegration"("platform");
CREATE INDEX "MarketingIntegration_enabled_idx" ON "MarketingIntegration"("enabled");

CREATE TABLE "MarketingDelivery" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "responseCode" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingDelivery_platform_eventName_eventId_key"
    ON "MarketingDelivery"("platform", "eventName", "eventId");
CREATE INDEX "MarketingDelivery_createdAt_idx" ON "MarketingDelivery"("createdAt");
CREATE INDEX "MarketingDelivery_status_createdAt_idx" ON "MarketingDelivery"("status", "createdAt");
