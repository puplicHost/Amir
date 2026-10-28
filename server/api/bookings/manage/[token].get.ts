import { getBookingSettings } from '../../../utils/booking-payments'

// Public self-service lookup by unguessable manage token (Roadmap Phase 8).
// Only the fields needed to display and cancel the booking.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') || ''
  if (!token) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  const booking = await prisma.booking.findUnique({
    where: { manageToken: token },
    include: {
      service: { select: { name: true, nameEn: true, slug: true } },
      assignedStaff: { select: { name: true } },
    },
  })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

  const settings = await getBookingSettings()
  const windowHours = (settings as any)?.cancellationWindowHours ?? 24
  const active = (booking.status === 'UNASSIGNED' || booking.status === 'ASSIGNED') && !(booking as any).cancelledAt
  const msLeft = booking.startsAt.getTime() - Date.now()
  const canCancel = active
    && booking.paymentStatus === 'PAID'
    && msLeft >= windowHours * 3600000

  return {
    bookingNumber: booking.bookingNumber,
    customerName: booking.customerName,
    serviceName: booking.service.name,
    serviceNameEn: booking.service.nameEn,
    serviceSlug: booking.service.slug,
    startsAt: booking.startsAt,
    durationMinSnapshot: booking.durationMinSnapshot,
    staffName: booking.assignedStaff?.name ?? null,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    depositCents: booking.depositCents,
    currency: settings.currency,
    timezone: settings.timezone,
    refundStatus: (booking as any).refundStatus ?? 'NONE',
    cancelledAt: (booking as any).cancelledAt,
    canCancel,
    cancelWindowHours: windowHours,
    lateCancel: active && booking.paymentStatus === 'PAID' && !canCancel,
  }
})
