-- CreateTable
CREATE TABLE "ServiceSectionImage" (
    "section" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSectionImage_pkey" PRIMARY KEY ("section")
);
