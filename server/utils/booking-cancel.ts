// Customer/admin cancellation + deposit refund flow (Roadmap Phase 8).
// Cancellation frees the slot immediately; the live refund attempt runs
// after the guarded status flip. Double cancellation is a no-op that never
// refunds twice (guarded update + stable idempotency keys).

import { isStatusTransitionAllowed } from '../../shared/booking.ts'
import { refundDeposit } from './refunds.ts'
import { notifyAdmins, notifyUser } from './admin-notifications.ts'
import { queueCancelMails } from './outbox.ts'

export type CancelBy = 'CUSTOMER' | 'ADMIN' | 'STAFF'
export type RefundMode = 'auto' | 'full' | 'none' | 'custom' | 'outside'

export interface CancelOutcome {
  alreadyCancelled: boolean
  bookingId: string
  refundStatus: string
  refundedCents: number
}

async function refundedSoFar(bookingId: string, client: any = prisma): Promise<number> {
  const rows = await client.bookingRefund.findMany({
    where: { bookingId, status: 'SUCCEEDED' },
    select: { amountCents: true },
  })
  return rows.reduce((sum: number, r: any) => sum + r.amountCents, 0)
}

export async function cancelBookingAndRefund(input: {
  bookingId: string
  cancelledBy: CancelBy
  reason?: string | null
  refundMode: RefundMode
  customAmountCents?: number
  initiatedBy?: string | null
}): Promise<CancelOutcome> {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

  // Idempotent replay: already closed → current state, no new side effects.
  if (
    booking.status === 'CANCELLED' || booking.status === 'CANCELLED_BY_STAFF'
    || (booking as any).cancelledAt
  ) {
    return {
      alreadyCancelled: true,
      bookingId: booking.id,
      refundStatus: (booking as any).refundStatus ?? 'NONE',
      refundedCents: await refundedSoFar(booking.id),
    }
  }
  if (!isStatusTransitionAllowed(booking.status, 'CANCELLED', { paymentStatus: booking.paymentStatus, needsRefund: booking.needsRefund })) {
    throw createError({ statusCode: 400, statusMessage: 'Booking cannot be cancelled in its current state' })
  }

  const wasAssignedStaffId = booking.assignedStaffId as string | null
  const paid = booking.paymentStatus === 'PAID'
  const alreadyRefunded = paid ? await refundedSoFar(booking.id) : 0
  const refundable = paid ? Math.max(0, booking.depositCents - alreadyRefunded) : 0

  let refundStatus = 'NONE'
  let refundedCents = alreadyRefunded
  let amountToRefund = 0
  if (input.refundMode === 'outside') {
    refundStatus = paid && refundable > 0 ? 'OUTSIDE' : 'NONE'
  }
  else if (input.refundMode === 'custom') {
    const asked = Math.floor(Number(input.customAmountCents) || 0)
    if (!paid || asked <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Nothing refundable for this booking' })
    }
    if (asked > refundable) {
      throw createError({ statusCode: 400, statusMessage: 'Refund exceeds the paid deposit' })
    }
    amountToRefund = asked
  }
  else if (input.refundMode === 'auto' || input.refundMode === 'full') {
    amountToRefund = refundable
  }
  // refundMode 'none' → no refund, status stays NONE.

  const reason = input.reason?.trim() || null
  const canAuto = amountToRefund > 0
    && (booking.paymentProvider === 'stripe' || booking.paymentProvider === 'paypal')
    && Boolean((booking as any).providerPaymentId)

  // Guarded flip: exactly one concurrent canceller wins; losers replay.
  const flipped = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      status: { in: ['UNASSIGNED', 'ASSIGNED'] },
      cancelledAt: null,
    },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: input.cancelledBy,
      cancellationReason: reason,
      ...(paid ? {} : { paymentStatus: 'EXPIRED' }),
      holdExpiresAt: null,
    },
  })
  if (flipped.count === 0) {
    const current = await prisma.booking.findUnique({ where: { id: booking.id } })
    return {
      alreadyCancelled: true,
      bookingId: booking.id,
      refundStatus: (current as any)?.refundStatus ?? 'NONE',
      refundedCents: await refundedSoFar(booking.id),
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingAssignment.updateMany({
      where: { bookingId: booking.id, unassignedAt: null },
      data: { unassignedAt: new Date(), reason: `Cancelled by ${input.cancelledBy.toLowerCase()}` },
    })
    await tx.booking.update({
      where: { id: booking.id },
      data: { assignedStaffId: null },
    })
  })

  if (amountToRefund > 0) {
    if (canAuto) {
      const idempotencyKey = input.refundMode === 'custom'
        ? `refund:${booking.id}:custom:${amountToRefund}`
        : `refund:${booking.id}`
      let row: any = null
      try {
        row = await prisma.bookingRefund.create({
          data: {
            bookingId: booking.id,
            amountCents: amountToRefund,
            reason,
            status: 'PENDING',
            provider: booking.paymentProvider,
            idempotencyKey,
            initiatedBy: input.initiatedBy || null,
          },
        })
      }
      catch (e: any) {
        if (e?.code !== 'P2002') throw e
        row = await prisma.bookingRefund.findUnique({ where: { idempotencyKey } })
      }
      if (row && row.status !== 'SUCCEEDED') {
        const settings = await prisma.siteSettings.findFirst()
        const attempt = await refundDeposit({
          paymentProvider: booking.paymentProvider,
          providerPaymentId: (booking as any).providerPaymentId,
          amountCents: amountToRefund,
          currency: (settings as any)?.defaultCurrency || 'EUR',
          idempotencyKey,
        })
        const ok = attempt.ok
        await prisma.bookingRefund.update({
          where: { id: row.id },
          data: {
            status: ok ? 'SUCCEEDED' : 'FAILED',
            providerRef: attempt.providerRef,
            ...(ok ? {} : { reason: [reason, attempt.error].filter(Boolean).join(' · ') }),
          },
        })
        refundStatus = ok ? 'SUCCEEDED' : 'FAILED'
        if (ok) refundedCents += amountToRefund
      }
      else if (row && row.status === 'SUCCEEDED') {
        refundStatus = 'SUCCEEDED'
        refundedCents += 0
      }
    }
    else {
      // Paid but not automatically refundable (manual/cash or legacy rows
      // without a provider reference): handled outside the system.
      refundStatus = 'OUTSIDE'
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { refundStatus } })
  }

  if (wasAssignedStaffId) {
    await notifyUser(wasAssignedStaffId, {
      type: 'booking_cancelled_by_staff',
      relatedEntityId: booking.id,
      url: '/admin/appointments?tab=my-bookings',
      titleEn: `Booking cancelled (${booking.bookingNumber})`,
      titleAr: `Termin storniert (${booking.bookingNumber})`,
      bodyEn: 'The slot is free again.',
      bodyAr: 'Der Slot ist wieder frei.',
    })
  }
  if (refundStatus === 'FAILED' || refundStatus === 'OUTSIDE') {
    await notifyAdmins({
      type: 'payment_needs_refund',
      relatedEntityId: booking.id,
      url: `/admin/bookings/${booking.id}`,
      titleEn: `Refund needs manual action (${booking.bookingNumber})`,
      titleAr: `Erstattung manuell prüfen (${booking.bookingNumber})`,
      bodyEn: refundStatus === 'FAILED'
        ? 'Automatic refund failed. Refund manually in the gateway dashboard.'
        : 'Deposit was paid outside the online flow. Settle directly with the customer.',
      bodyAr: refundStatus === 'FAILED'
        ? 'Automatische Erstattung fehlgeschlagen. Bitte manuell im Zahlungs-Dashboard erstatten.'
        : 'Anzahlung wurde außerhalb des Online-Flows geleistet. Bitte direkt mit dem Kunden klären.',
    })
  }

  const settings = await prisma.siteSettings.findFirst()
  await queueCancelMails(booking.id, {
    refundedCents: refundStatus === 'SUCCEEDED' ? refundedCents : 0,
    currency: (settings as any)?.defaultCurrency || 'EUR',
  })

  return { alreadyCancelled: false, bookingId: booking.id, refundStatus, refundedCents }
}
