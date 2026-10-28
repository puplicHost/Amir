// Roadmap Phase 7 checks: mail templates (no sensitive data), ICS shape,
// outbox dedupe + log-provider sending.
// Prerequisites: dev server running (for nothing — DB only), migrations applied.
// Run: node scripts/verify-7.mjs
import { PrismaClient } from '@prisma/client'
import {
  bookingCancelledMail,
  bookingConfirmedMail,
  bookingChangedMail,
  buildBookingIcs,
  refundConfirmedMail,
  reminderMail,
} from '../server/utils/customer-mails.ts'

const prisma = new PrismaClient()
globalThis.prisma = prisma
const { queueCustomerEmail, processOutbox, queueBookingMail } = await import('../server/utils/outbox.ts')

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

async function main() {
  const ctx = {
    customerName: 'PH7 Customer',
    serviceName: 'Test Service',
    startsAt: new Date('2026-11-01T09:00:00Z'),
    staffName: 'Staff A',
    bookingNumber: 'BK-PH7-001',
    manageUrl: 'https://example.com/booking/manage/secret123',
  }
  // 1. Templates: content + no sensitive data.
  const c = bookingConfirmedMail('de', ctx)
  check('confirmation de subject has service', c.subject.includes('Test Service'))
  check('confirmation includes manage link', c.text.includes('secret123'))
  check('confirmation leaks no payment data',
    !/stripe|paypal|iban|kreditkarte|card number/i.test(c.text))
  const cEn = bookingConfirmedMail('en', ctx)
  check('confirmation en differs from de', cEn.subject !== c.subject)
  const ch = bookingChangedMail('de', ctx)
  check('change mail has booking number', ch.text.includes('BK-PH7-001'))
  const cx = bookingCancelledMail('en', ctx)
  check('cancel mail en mentions cancellation', /cancel/i.test(cx.subject))
  const rf = refundConfirmedMail('de', ctx, '23,00 €')
  check('refund mail has amount', rf.text.includes('23,00 €'))
  const rm = reminderMail('de', ctx)
  check('reminder mail has date', rm.text.includes('2026') || rm.text.includes('November'))

  // 2. ICS shape.
  const ics = buildBookingIcs({
    uid: 'bk1@amir', startsAt: new Date('2026-11-01T09:00:00Z'),
    durationMin: 30, summary: 'Test — AMIR', address: 'Addr, 123',
  })
  check('ics is a VEVENT with UTC stamps',
    ics.includes('BEGIN:VEVENT') && ics.includes('DTSTART:20261101T090000Z')
    && ics.includes('DTEND:20261101T093000Z') && ics.includes('UID:bk1@amir'))
  check('ics escapes commas', ics.includes('Addr\\, 123'))

  // 3. Outbox dedupe + sending (log provider).
  const services = await prisma.service.findFirst({ where: { isActive: true } })
  if (!services) throw new Error('no active service')
  await prisma.booking.deleteMany({ where: { customerName: 'PH7-TEST-Customer' } })
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: 'BK-PH7-001',
      serviceId: services.id,
      customerName: 'PH7-TEST-Customer',
      customerPhone: '+491511234567',
      customerEmail: 'ph7@test.invalid',
      startsAt: new Date(Date.now() + 3 * 86400000),
      durationMinSnapshot: 30,
      priceSnapshotCents: 4600,
      depositCents: 2300,
      paymentProvider: 'manual',
      paymentStatus: 'PAID',
      idempotencyKey: 'idemp-ph7-001',
      publicToken: 'pub-ph7-001',
      manageToken: 'mng-ph7-001',
      locale: 'de',
      status: 'ASSIGNED',
    },
  })
  await queueBookingMail(booking.id, 'booking_confirmed')
  await queueBookingMail(booking.id, 'booking_confirmed')
  const rows = await prisma.notificationOutbox.findMany({ where: { bookingId: booking.id } })
  check('double queue yields one outbox row (dedupe)', rows.length === 1)
  check('confirmation row carries ical', Boolean(rows[0]?.ical?.includes('BEGIN:VCALENDAR')))
  const res = await processOutbox(20)
  check('log provider sends the row', res.sent === 1)
  const after = await prisma.notificationOutbox.findUnique({ where: { id: rows[0].id } })
  check('row marked SENT', after.status === 'SENT' && after.sentAt !== null)
  const res2 = await processOutbox(20)
  check('second sweep sends nothing (no dup)', res2.sent === 0)

  await prisma.booking.deleteMany({ where: { customerName: 'PH7-TEST-Customer' } })
  console.log('cleanup: phase 7 fixtures removed')
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail ? 1 : 0
}

main().catch(async (e) => {
  console.error('Test crashed:', e?.message || e)
  await prisma.booking.deleteMany({ where: { customerName: 'PH7-TEST-Customer' } }).catch(() => null)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
