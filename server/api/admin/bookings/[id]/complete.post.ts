import { requirePermission } from '../../../../utils/auth'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'bookings.complete')
  const id = getRouterParam(event, 'id') || ''

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  // Permission check: if user cannot view/manage all bookings, they can only
  // complete their own assigned bookings. Request for another booking returns 404.
  const canCompleteAny = user.isSuper || user.permissions.includes('bookings.view_all') || user.permissions.includes('bookings.assign')
  if (!canCompleteAny && booking.assignedStaffId !== user.userId) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  if (booking.status !== 'ASSIGNED') {
    throw createError({ statusCode: 400, statusMessage: 'Only ASSIGNED bookings can be marked completed' })
  }

  // Can only complete after start time
  if (booking.startsAt.getTime() > Date.now()) {
    throw createError({ statusCode: 400, statusMessage: 'Booking can only be marked completed after its appointment time' })
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'COMPLETED' },
  })

  await logAudit({
    entityType: 'booking',
    entityId: booking.id,
    entityName: booking.bookingNumber,
    action: 'updated',
    details: `Marked completed by ${user.name}`,
    user,
  })

  return { success: true, booking: updated }
})
