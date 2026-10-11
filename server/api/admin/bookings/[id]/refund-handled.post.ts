import { requirePermission } from '../../../../utils/auth'
import { refundHandledSchema, parseBody } from '../../../../utils/validate'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'bookings.refund_handle')

  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, refundHandledSchema)

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { needsRefund: false },
  })

  const note = body.note?.trim()
  const details = note
    ? `Marked refund handled manually in payment dashboard: ${note}`
    : 'Marked refund handled manually in payment dashboard'

  await logAudit({
    entityType: 'booking',
    entityId: booking.id,
    entityName: booking.bookingNumber,
    action: 'updated',
    details,
    user,
  })

  return { success: true }
})
