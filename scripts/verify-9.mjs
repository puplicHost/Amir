// Roadmap Phase 9 checks: due reminders queued once (dedupe), bookings
// made within the lead time skipped, reminders feed works.
// Prerequisites: dev server running (nothing server-side needed except DB),
// migrations applied. Reminder sending itself is covered by verify-7 outbox.
// Run: node scripts/verify-9.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
globalThis.prisma = prisma
const { queueDueReminders } = await import('../server/utils/reminders.ts')

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

async function main() {
  const service = await prisma.service.findFirst({ where: { isActive: true } })
  if (!service) throw new Error('no active service')
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH9-TEST-' } } })
  const now = Date.now()
  const mk = (name, startsAt, createdAt, email) => prisma.booking.create({
    data: {
      bookingNumber: `BK-PH9-${name}`,
      serviceId: service.id,
      customerName: `PH9-TEST-${name}`,
      customerPhone: '+491511234567',
      customerEmail: email,
      startsAt,
      createdAt,
      durationMinSnapshot: 30,
      priceSnapshotCents: 4600,
      depositCents: 2300,
      paymentProvider: 'manual',
      paymentStatus: 'PAID',
      idempotencyKey: `idemp-ph9-${name}`,
      publicToken: `pub-ph9-${name}`,
      status: 'ASSIGNED',
      assignedStaffId: null,
    },
  })

  // Due: starts in 50 min, created 2h ago, has email.
  const due = await mk('DUE',
    new Date(now + 50 * 60000), new Date(now - 2 * 3600000), 'ph9@test.invalid')
  // Too early: starts in 5h.
  await mk('EARLY', new Date(now + 5 * 3600000), new Date(now - 2 * 3600000), 'ph9@test.invalid')
  // Made within lead: starts in 50 min but created 5 min ago.
  await mk('FRESH', new Date(now + 50 * 60000), new Date(now - 5 * 60000), 'ph9@test.invalid')
  // No email: starts in 50 min, created 2h ago.
  await mk('NOEMAIL', new Date(now + 50 * 60000), new Date(now - 2 * 3600000), null)

  const n1 = await queueDueReminders(new Date(now))
  check('exactly one due reminder queued', n1 === 1)
  const rows = await prisma.notificationOutbox.findMany({ where: { type: 'reminder' } })
  check('reminder targets the due booking with stable dedupe key',
    rows.length === 1 && rows[0].bookingId === due.id
    && rows[0].dedupeKey === `reminder:${due.id}:${due.startsAt.getTime()}`)
  const n2 = await queueDueReminders(new Date(now))
  check('second run queues nothing (dedupe)', n2 === 0)

  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH9-TEST-' } } })
  console.log('cleanup: phase 9 fixtures removed')
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail ? 1 : 0
}

main().catch(async (e) => {
  console.error('Test crashed:', e?.message || e)
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH9-TEST-' } } }).catch(() => null)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
