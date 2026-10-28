import { getBookingSettings, getGatewayStatus, purchaseEventId } from '../../../utils/booking-payments'

// Public booking status lookup by unguessable token.
// Returns status + service + slot + deposit + eventId ONLY — never name/phone/email.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') || ''
  if (!token) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  const booking = await prisma.booking.findUnique({
    where: { publicToken: token },
    include: { service: { select: { name: true, slug: true } } },
  })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  const settings = await getBookingSettings()
  const gateways = await getGatewayStatus()
  return {
    bookingNumber: booking.bookingNumber,
    paymentStatus: booking.paymentStatus,
    status: booking.status,
    serviceName: booking.service.name,
    durationMin: booking.durationMinSnapshot,
    serviceSlug: booking.service.slug,
    startsAt: booking.startsAt,
    depositCents: booking.depositCents,
    currency: settings.currency,
    gateways,
    eventId: purchaseEventId(booking.id),
  }
})
