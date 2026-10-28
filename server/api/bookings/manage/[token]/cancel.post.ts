import { getBookingSettings } from '../../../../utils/booking-payments'
import { cancelBookingAndRefund } from '../../../../utils/booking-cancel'
import { parseBody } from '../../../../utils/validate'
import { z } from 'zod'

// Customer self-cancellation (Roadmap Phase 8). Allowed only for paid,
// active bookings earlier than the cancellation window (default 24h).
// The window is enforced server-side; the deposit is refunded automatically.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') || ''
  if (!token) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  const body = await parseBody(event, z.object({
    reason: z.string().trim().max(500).nullish(),
  }))

  const booking = await prisma.booking.findUnique({ where: { manageToken: token } })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

  const settings = await getBookingSettings()
  const windowHours = (settings as any)?.cancellationWindowHours ?? 24
  const active = (booking.status === 'UNASSIGNED' || booking.status === 'ASSIGNED') && !(booking as any).cancelledAt
  // Replays of an already-cancelled booking delegate to the idempotent flow
  // below (no-op success, never a second refund).
  if (active) {
    if (booking.paymentStatus !== 'PAID') {
      throw createError({ statusCode: 400, statusMessage: 'Booking cannot be cancelled online' })
    }
    if (booking.startsAt.getTime() - Date.now() < windowHours * 3600000) {
      throw createError({ statusCode: 400, statusMessage: 'Online cancellation is only possible up to 24 hours before the appointment' })
    }
  }

  const outcome = await cancelBookingAndRefund({
    bookingId: booking.id,
    cancelledBy: 'CUSTOMER',
    reason: body.reason?.trim() || null,
    refundMode: 'auto',
    initiatedBy: 'customer',
  })
  return outcome
})
