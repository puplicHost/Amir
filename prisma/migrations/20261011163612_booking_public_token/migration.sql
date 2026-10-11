-- Add unguessable public lookup key to Booking (Phase 2c).
-- The Booking table is empty at this point, so NOT NULL without a default
-- applies cleanly. The application always sets publicToken (32 hex chars)
-- at creation; it is never null in practice.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "publicToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_publicToken_key" ON "Booking"("publicToken");
