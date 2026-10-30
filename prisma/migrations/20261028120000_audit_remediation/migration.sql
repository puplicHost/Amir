-- AUDIT remediation migration (P1-01, P1-03, P2-07, P2-08, P2-09, P2-11, P2-15, P3-13).
-- Prepared only. Do not execute without a reviewed backup/rollback plan.

-- P2-07: persisted lockout + password rotation timestamp.
ALTER TABLE "AdminUser"
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

-- P2-08: revocable server-side admin sessions.
CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_userId_revokedAt_idx" ON "AdminSession"("userId", "revokedAt");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
ALTER TABLE "AdminSession"
  ADD CONSTRAINT "AdminSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- P1-01: server-captured terms/privacy/marketing consent evidence.
ALTER TABLE "Booking"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyVersion" TEXT,
  ADD COLUMN "marketingConsentAt" TIMESTAMP(3),
  ADD COLUMN "marketingConsentVersion" TEXT,
  -- P2-13: consent-gated network signals for Meta CAPI match quality.
  ADD COLUMN "metaClientIp" TEXT,
  ADD COLUMN "metaClientUa" TEXT;

-- P2-11/P3-13: optional English service copy; NULL means German fallback.
ALTER TABLE "Service"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "descriptionEn" TEXT;

-- P2-11: optional German catalog copy for products/categories. Existing rows
-- stay NULL and fall back to the English fields at render time.
ALTER TABLE "Product"
  ADD COLUMN "nameDe" TEXT,
  ADD COLUMN "descriptionDe" TEXT;
ALTER TABLE "Category"
  ADD COLUMN "nameDe" TEXT,
  ADD COLUMN "descriptionDe" TEXT;

-- P1-03: optimistic-concurrency revision for working hours.
ALTER TABLE "WorkingHours"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkingHours" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- P2-01: distinguish simulated (log provider) and provider-accepted deliveries.
ALTER TABLE "NotificationOutbox"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;

-- P2-15: enforce the SiteSettings singleton. Keep the oldest row and make any
-- historical duplicates non-singletons (they remain readable for recovery).
ALTER TABLE "SiteSettings" ADD COLUMN "singleton" BOOLEAN DEFAULT true;
UPDATE "SiteSettings"
  SET "singleton" = NULL
  WHERE "id" <> (SELECT MIN("id") FROM "SiteSettings");
CREATE UNIQUE INDEX "SiteSettings_singleton_key" ON "SiteSettings"("singleton");

-- P2-09: shared fixed-window rate limiter.
CREATE TABLE "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
