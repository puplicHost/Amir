import { requirePermission } from '../../../utils/auth'
import { staffCancelSchema, parseBody } from '../../../utils/validate'
import { notifyAdmins } from '../../../utils/admin-notifications'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['bookings.view_all', 'bookings.cancel_own'])
  const canCancelAny = user.isSuper || user.permissions.includes('bookings.view_all')
  const body = await parseBody(event, staffCancelSchema)

  const bookings = await prisma.booking.findMany({
    where: { id: { in: body.bookingIds } },
    select: { id: true, bookingNumber: true, assignedStaffId: true, status: true },
  })

  if (bookings.length !== body.bookingIds.length) {
    throw createError({ statusCode: 404, statusMessage: 'One or more bookings not found' })
  }

  // Server-side security check:
  // If user does not hold bookings.view_all, they may ONLY cancel their own ASSIGNED bookings.
  for (const b of bookings) {
    if (!canCancelAny && b.assignedStaffId !== user.userId) {
      throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
    }
    if (b.status !== 'ASSIGNED' || !b.assignedStaffId) {
      throw createError({
        statusCode: 400,
        statusMessage: `Booking ${b.bookingNumber} is not currently assigned`,
      })
    }
  }

  const reason = body.reason?.trim() || 'Cancelled by staff'
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    for (const b of bookings) {
      await tx.bookingAssignment.updateMany({
        where: { bookingId: b.id, staffId: b.assignedStaffId!, unassignedAt: null },
        data: { unassignedAt: now, reason },
      })
      await tx.booking.update({
        where: { id: b.id },
        data: { status: 'UNASSIGNED', assignedStaffId: null },
      })
    }
  })

  // One notification to the admin side listing all cancelled bookings
  const bookingNumbers = bookings.map(b => b.bookingNumber)
  await notifyAdmins({
    type: 'booking_cancelled_by_staff',
    relatedEntityId: bookings[0]?.id || '',
    url: '/admin/bookings?status=UNASSIGNED',
    titleEn: `Bookings cancelled by staff (${user.name})`,
    titleAr: `Termine von Mitarbeiter storniert (${user.name})`,
    bodyEn: `Staff ${user.name} cancelled ${bookingNumbers.join(', ')}. Reason: ${reason}`,
    bodyAr: `Mitarbeiter ${user.name} hat ${bookingNumbers.join(', ')} storniert. Grund: ${reason}`,
  })

  // Audit log for each cancelled booking
  for (const b of bookings) {
    await logAudit({
      entityType: 'booking',
      entityId: b.id,
      entityName: b.bookingNumber,
      action: 'updated',
      details: `Cancelled by staff (${user.name}): ${reason}`,
      user,
    })
  }

  return { success: true, count: bookings.length }
})
