// Customer appointment reminders (Roadmap Phase 9).
// Email reminders are queued automatically once per booking when the lead
// time arrives (dedupeKey reminder:<bookingId>:<startsAt>). WhatsApp stays
// manual via the admin reminders page (wa.me links, opt-in recorded).

import { getBookingSettings } from './booking-payments.ts'
import { queueCustomerEmail } from './outbox.ts'
import { reminderMail, toCustomerLocale } from './customer-mails.ts'
import { siteBaseUrl } from './mailer.ts'

/** Queue due email reminders. Returns queued count. Never throws. */
export async function queueDueReminders(now: Date = new Date()): Promise<number> {
  try {
    const settings = await getBookingSettings()
    const leadMin = (settings as any)?.reminderLeadMin ?? 60
    if ((settings as any)?.reminderEmailEnabled === false) return 0
    const cutoffMs = now.getTime() + leadMin * 60000

    const candidates = await prisma.booking.findMany({
      where: {
        paymentStatus: 'PAID',
        // UX-08: paid-but-not-yet-assigned bookings also get a reminder
        // (staff name is optional in the template).
        status: { in: ['ASSIGNED', 'UNASSIGNED'] },
        startsAt: { gt: now, lte: new Date(cutoffMs) },
      },
      take: 200,
      include: {
        service: { select: { name: true } },
        assignedStaff: { select: { name: true } },
      },
    })
    if (!candidates.length) return 0
    const existing = await prisma.notificationOutbox.findMany({
      where: {
        type: 'reminder',
        bookingId: { in: candidates.map(b => b.id) },
      },
      select: { dedupeKey: true },
    })
    const seen = new Set(existing.map(r => r.dedupeKey))
    const base = siteBaseUrl()
    let queued = 0
    for (const b of candidates) {
      const key = `reminder:${b.id}:${b.startsAt.getTime()}`
      if (seen.has(key)) continue
      // Bookings made within the lead time already got a confirmation —
      // no separate reminder.
      if (b.createdAt.getTime() > b.startsAt.getTime() - leadMin * 60000) continue
      if (!b.customerEmail) continue
      const locale = toCustomerLocale((b as any).locale)
      const token = (b as any).manageToken as string | null
      const mail = reminderMail(locale, {
        customerName: b.customerName,
        serviceName: b.service.name,
        startsAt: b.startsAt,
        staffName: b.assignedStaff?.name ?? null,
        bookingNumber: b.bookingNumber,
        manageUrl: token && base ? `${base}/booking/manage/${token}` : null,
        timeZone: settings.timezone,
      })
      await queueCustomerEmail({
        bookingId: b.id,
        type: 'reminder',
        dedupeKey: key,
        locale,
        to: b.customerEmail,
        mail,
      })
      queued++
    }
    return queued
  }
  catch (e) {
    console.warn('[reminders] queue failed:', (e as Error)?.message || e)
    return 0
  }
}
