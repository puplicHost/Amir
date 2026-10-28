// Notification outbox (Roadmap Phase 7): durable, deduplicated customer mail.
// Queueing never fails a booking (all errors are swallowed after logging).
// The sweeper sends PENDING rows with backoff; dedupeKey guarantees
// exactly-once even across webhook replays and parallel sweepers.

import { sendMail, siteBaseUrl } from './mailer.ts'
import { logWarn } from './logger.ts'
import { centsToEur } from '../../shared/booking.ts'
import {
  bookingCancelledMail,
  bookingChangedMail,
  bookingConfirmedMail,
  buildBookingIcs,
  refundConfirmedMail,
  toCustomerLocale,
} from './customer-mails.ts'
import type { BuiltMail } from './customer-mails.ts'
import { getSiteSettings } from './site-settings.ts'

/** Salon timezone for customer-facing date strings (P2-05). */
async function salonTimeZone(): Promise<string> {
  try {
    return (await getSiteSettings())?.timezone || 'Europe/Berlin'
  }
  catch {
    return 'Europe/Berlin'
  }
}

export type OutboxType =
  | 'booking_confirmed'
  | 'booking_changed'
  | 'booking_cancelled'
  | 'refund_confirmed'
  | 'reminder'

const MAX_ATTEMPTS = 10

export async function queueCustomerEmail(input: {
  bookingId: string
  type: OutboxType
  dedupeKey: string
  locale: string
  to: string
  mail: BuiltMail
  ical?: string | null
  sendAfter?: Date
}): Promise<void> {
  try {
    if (!input.to || !input.to.includes('@')) return
    await prisma.notificationOutbox.create({
      data: {
        bookingId: input.bookingId,
        type: input.type,
        channel: 'EMAIL',
        locale: input.locale,
        sendTo: input.to.trim(),
        subject: input.mail.subject,
        bodyText: input.mail.text,
        bodyHtml: input.mail.html,
        ical: input.ical || null,
        dedupeKey: input.dedupeKey,
        ...(input.sendAfter ? { sendAfter: input.sendAfter } : {}),
      },
    })
  }
  catch (e: any) {
    // P2002 = duplicate dedupeKey → already queued, nothing to do.
    if (e?.code !== 'P2002') console.warn('[outbox] queue failed:', (e as Error)?.message || e)
  }
}

/**
 * Queue a confirmation or change mail for a booking. Reads the fresh row,
 * skips silently when the customer left no email. Never throws.
 */
export async function queueBookingMail(
  bookingId: string,
  type: 'booking_confirmed' | 'booking_changed',
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true } },
        assignedStaff: { select: { name: true } },
      },
    })
    if (!booking || !booking.customerEmail) return
    const locale = toCustomerLocale((booking as any).locale)
    const base = siteBaseUrl()
    const token = (booking as any).manageToken as string | null
    const manageUrl = token && base ? `${base}/booking/manage/${token}` : null
    const timeZone = await salonTimeZone()
    const ctx = {
      customerName: booking.customerName,
      serviceName: booking.service.name,
      startsAt: booking.startsAt,
      staffName: booking.assignedStaff?.name ?? null,
      bookingNumber: booking.bookingNumber,
      manageUrl,
      timeZone,
    }
    const mail = type === 'booking_confirmed'
      ? bookingConfirmedMail(locale, ctx)
      : bookingChangedMail(locale, ctx)
    const ical = type === 'booking_confirmed'
      ? buildBookingIcs({
        uid: `${booking.id}@amir`,
        startsAt: booking.startsAt,
        durationMin: booking.durationMinSnapshot,
        summary: `${booking.service.name} — AMIR`,
        description: `${locale === 'de' ? 'Termin' : 'Appointment'} ${booking.bookingNumber}`,
      })
      : null
    const dedupeKey = type === 'booking_confirmed'
      ? `confirmed:${booking.id}`
      : `changed:${booking.id}:${booking.startsAt.getTime()}:${booking.assignedStaffId || 'none'}`
    await queueCustomerEmail({
      bookingId: booking.id,
      type,
      dedupeKey,
      locale,
      to: booking.customerEmail,
      mail,
      ical,
    })
  }
  catch (e) {
    console.warn('[outbox] queueBookingMail failed:', (e as Error)?.message || e)
  }
}

/**
 * Queue cancellation (+ refund confirmation) mails. Never throws.
 */
export async function queueCancelMails(
  bookingId: string,
  opts: { refundedCents: number, currency: string },
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true } },
        assignedStaff: { select: { name: true } },
      },
    })
    if (!booking || !booking.customerEmail) return
    const locale = toCustomerLocale((booking as any).locale)
    const base = siteBaseUrl()
    const token = (booking as any).manageToken as string | null
    const manageUrl = token && base ? `${base}/booking/manage/${token}` : null
    const timeZone = await salonTimeZone()
    const ctx = {
      customerName: booking.customerName,
      serviceName: booking.service.name,
      startsAt: booking.startsAt,
      staffName: booking.assignedStaff?.name ?? null,
      bookingNumber: booking.bookingNumber,
      manageUrl,
      timeZone,
    }
    await queueCustomerEmail({
      bookingId: booking.id,
      type: 'booking_cancelled',
      dedupeKey: `cancelled:${booking.id}`,
      locale,
      to: booking.customerEmail,
      mail: bookingCancelledMail(locale, ctx),
    })
    if (opts.refundedCents > 0) {
      const amount = locale === 'de'
        ? centsToEur(opts.refundedCents)
        : `EUR ${(opts.refundedCents / 100).toFixed(2)}`
      await queueCustomerEmail({
        bookingId: booking.id,
        type: 'refund_confirmed',
        dedupeKey: `refunded:${booking.id}:${opts.refundedCents}`,
        locale,
        to: booking.customerEmail,
        mail: refundConfirmedMail(locale, ctx, amount),
      })
    }
  }
  catch (e) {
    console.warn('[outbox] queueCancelMails failed:', (e as Error)?.message || e)
  }
}

/** Send due rows. Returns sent/simulated/failed counts. Safe for parallel sweepers. */
export async function processOutbox(batch = 20, now: Date = new Date()): Promise<{ sent: number, simulated: number, failed: number }> {
  let sent = 0
  let simulated = 0
  let failed = 0
  const due = await prisma.notificationOutbox.findMany({
    where: { status: 'PENDING', sendAfter: { lte: now } },
    orderBy: { sendAfter: 'asc' },
    take: batch,
  })
  for (const row of due) {
    // Claim the row: losers of the race skip it (exactly-once).
    const claimed = await prisma.notificationOutbox.updateMany({
      where: { id: row.id, status: 'PENDING' },
      data: { status: 'SENDING' },
    })
    if (claimed.count === 0) continue
    try {
      const result = await sendMail({
        to: row.sendTo,
        subject: row.subject,
        text: row.bodyText,
        html: row.bodyHtml,
        ical: row.ical,
      })
      if (result.simulated) {
        // AUDIT P2-01: log provider = simulation. Never mark SENT/delivered.
        await prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'SIMULATED',
            simulated: true,
            provider: result.provider,
            acceptedAt: null,
            sentAt: null,
            lastError: 'Simulated delivery: mail provider is "log". Configure a real provider to deliver customer mail.',
          },
        })
        simulated++
        logWarn('Customer mail simulated (not delivered)', {
          outboxId: row.id,
          provider: result.provider,
          type: row.type,
        })
      }
      else {
        await prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            acceptedAt: new Date(),
            simulated: false,
            provider: result.provider,
            lastError: null,
          },
        })
        sent++
      }
    }
    catch (e: any) {
      const attempts = row.attempts + 1
      const backoffMin = Math.min(360, 2 ** Math.min(attempts, 8))
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          attempts,
          lastError: String((e as Error)?.message || e).slice(0, 500),
          ...(attempts >= MAX_ATTEMPTS
            ? { status: 'FAILED' }
            : { status: 'PENDING', sendAfter: new Date(Date.now() + backoffMin * 60000) }),
        },
      })
      failed++
    }
  }
  // 'SENDING' rows orphaned by a crashed sweeper return to PENDING.
  await prisma.notificationOutbox.updateMany({
    where: { status: 'SENDING', sendAfter: { lt: new Date(now.getTime() - 15 * 60000) } },
    data: { status: 'PENDING' },
  }).catch(() => null)
  return { sent, simulated, failed }
}
