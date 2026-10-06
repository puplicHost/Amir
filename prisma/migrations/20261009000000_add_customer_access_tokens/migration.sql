-- Short-lived single-resource tokens guarding order/quote PII reads.
CREATE TABLE "CustomerAccessToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccessToken_tokenHash_key" ON "CustomerAccessToken"("tokenHash");
CREATE INDEX "CustomerAccessToken_resourceType_resourceId_idx" ON "CustomerAccessToken"("resourceType", "resourceId");
CREATE INDEX "CustomerAccessToken_expiresAt_idx" ON "CustomerAccessToken"("expiresAt");
