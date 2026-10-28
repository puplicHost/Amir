import { requirePermission } from '../../../../utils/auth'
import { waLink } from '../../../../../shared/booking'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['bookings.view_all', 'bookings.view_own'])
  const id = getRouterParam(event, 'id') || ''

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: { select: { id: true, name: true, slug: true, section: true } },
      assignedStaff: { select: { id: true, name: true, email: true } },
      assignments: {
        orderBy: { assignedAt: 'desc' },
        include: { staff: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  // Server-side guard: STAFF may only view bookings assigned to them.
  // Request for another booking returns 404 (never reveal existence).
  const canViewAll = user.isSuper || user.permissions.includes('bookings.view_all')
  if (!canViewAll && booking.assignedStaffId !== user.userId) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  const mailLog = await prisma.notificationOutbox.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, type: true, status: true, sendTo: true, subject: true,
      attempts: true, lastError: true, sentAt: true, createdAt: true,
    },
  })

  return {
    booking: {
      ...booking,
      waLink: waLink(booking.customerPhone),
    },
    mailLog,
  }
})
