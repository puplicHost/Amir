-- DB-01/DB-02: indexes for the busiest booking queries.
--  * Booking_startsAt_idx                          bare startsAt-range scans
--                                                  (availability/confirm/assign/reschedule)
--  * Booking_status_startsAt_idx                   calendar/queue by status within a range
--  * Booking_paymentStatus_holdExpiresAt_idx       hold expiry sweeper + expireHolds()

-- CreateIndex
CREATE INDEX "Booking_startsAt_idx" ON "Booking"("startsAt");

-- CreateIndex
CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_holdExpiresAt_idx" ON "Booking"("paymentStatus", "holdExpiresAt");
