import { requirePermission } from '../../../../utils/auth'
import { parseBody } from '../../../../utils/validate'
import { cancelBookingAndRefund } from '../../../../utils/booking-cancel'
import { logAudit } from '../../../../utils/audit'
import { z } from 'zod'

// Admin cancellation with refund decision (Roadmap Phase 8). No cancellation
// window: the admin decides (emergency, salon closure, ...).
// mode: refund_full | no_refund | custom | outside.
const adminCancelSchema = z.object({
  mode: z.enum(['refund_full', 'no_refund', 'custom', 'outside']),
  amountCents: z.coerce.number().int().min(1).max(100_000_000).nullish(),
  reason: z.string().trim().max(500).nullish(),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'bookings.refund_issue')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, adminCancelSchema)

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

  const outcome = await cancelBookingAndRefund({
    bookingId: booking.id,
    cancelledBy: 'ADMIN',
    reason: body.reason?.trim() || null,
    refundMode: body.mode === 'refund_full' ? 'full' : body.mode === 'custom' ? 'custom' : body.mode === 'outside' ? 'outside' : 'none',
    customAmountCents: body.amountCents ?? undefined,
    initiatedBy: user.userId,
  })
  await logAudit({
    entityType: 'booking',
    entityId: booking.id,
    entityName: booking.bookingNumber,
    action: 'updated',
    details: `Cancelled by admin (${body.mode})${body.reason?.trim() ? `: ${body.reason.trim()}` : ''}`,
    user,
  })
  return outcome
})
