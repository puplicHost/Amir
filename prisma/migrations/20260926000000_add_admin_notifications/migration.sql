-- CreateTable: AdminDeviceToken / AdminNotification (admin push + notification center)
CREATE TABLE "AdminDeviceToken" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "relatedEntityId" TEXT,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminDeviceToken_fcmToken_key" ON "AdminDeviceToken"("fcmToken");
CREATE INDEX "AdminDeviceToken_adminUserId_idx" ON "AdminDeviceToken"("adminUserId");
CREATE INDEX "AdminNotification_adminUserId_isRead_idx" ON "AdminNotification"("adminUserId", "isRead");
CREATE INDEX "AdminNotification_adminUserId_createdAt_idx" ON "AdminNotification"("adminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminDeviceToken" ADD CONSTRAINT "AdminDeviceToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
