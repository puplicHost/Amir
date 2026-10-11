// Phase 2c unit checks — pure functions only, no DB, no network.
// Run: node scripts/verify-2c.mjs
import {
  daySlotStarts,
  daysFromToday,
  isOnSlotStep,
  markAvailable,
  overlaps,
  tzDayStr,
  tzOffsetMinutes,
  tzParts,
  wallToUtcMs,
} from '../server/utils/booking-slots.ts'
import { decideConfirmation, decideLatePayment, isExpectedAmount } from '../server/utils/booking-confirm.ts'
import { depositCentsFor, eurToCents } from '../shared/booking.ts'

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

const TZ = 'Europe/Berlin'

// --- Berlin wall/UTC round-trips (winter + DST summer) ---
const winterUtc = Date.UTC(2026, 0, 15, 12, 0) // Jan: CET (+60)
const summerUtc = Date.UTC(2026, 6, 15, 12, 0) // Jul: CEST (+120)
check('winter offset +60', tzOffsetMinutes(winterUtc, TZ) === 60)
check('summer offset +120', tzOffsetMinutes(summerUtc, TZ) === 120)
const wp = tzParts(summerUtc, TZ)
check('summer wall 14:00', wp.hour === 14 && wp.minute === 0)
const rt = wallToUtcMs(2026, 7, 15, 14, 0, TZ)
check('wall->utc round-trip', rt === summerUtc)
check('weekday mapping', tzParts(Date.UTC(2026, 9, 11, 12, 0), TZ).weekday === 0) // 2026-10-11 is a Sunday
check('day str', tzDayStr(summerUtc, TZ) === '2026-07-15')
check('daysFromToday', daysFromToday('2026-07-20', '2026-07-15') === 5)

// --- slot grid: 09:00-18:00, step 15, duration 45 ---
// Fake "now" long before the day so all slots are future.
const slots = daySlotStarts({
  dayStr: '2026-07-15', openMin: 540, closeMin: 1080,
  stepMin: 15, durationMin: 45, nowUtcMs: Date.UTC(2026, 6, 1), tz: TZ,
})
check('first slot 09:00 Berlin', tzParts(slots[0], TZ).hour === 9 && tzParts(slots[0], TZ).minute === 0)
const last = tzParts(slots[slots.length - 1], TZ)
check('last slot fits duration (ends 18:00)', last.hour === 17 && last.minute === 15)
check('slot count', slots.length === ((1080 - 45 - 540) / 15) + 1)
check('all on step grid', slots.every(s => isOnSlotStep(s, '2026-07-15', 540, 15, TZ)))
check('off-grid rejected', !isOnSlotStep(wallToUtcMs(2026, 7, 15, 9, 7, TZ), '2026-07-15', 540, 15, TZ))

// --- overlap: [start, start+dur) half-open ---
check('overlap basic', overlaps(0, 10, 5, 15) === true)
check('touching edges do NOT overlap', overlaps(0, 10, 10, 20) === false)
check('no overlap', overlaps(0, 10, 20, 30) === false)
const avail = markAvailable([0, 3600000, 7200000], [{ start: 1800000, end: 2400000 }], 60)
check('markAvailable blocks only hit slot', JSON.stringify(avail) === JSON.stringify([false, true, true]))

// --- deposit rounding half-up ---
check('50% of 4600 = 2300', depositCentsFor(4600, 50) === 2300)
check('50% of 15.00 odd cent: 50% of 15 = 7.5 -> 8', depositCentsFor(15, 50) === 8)
check('50% of 600 = 300', depositCentsFor(600, 50) === 300)
check('eurToCents 46.00', eurToCents('46.00') === 4600)
check('eurToCents 46,00 comma', eurToCents('46,00') === 4600)

// --- confirmation idempotency ---
check('pending+matching ref -> confirm',
  decideConfirmation({ paymentStatus: 'PENDING', providerRef: 'cs_1' }, 'cs_1') === 'confirm')
check('pending, no refs -> confirm',
  decideConfirmation({ paymentStatus: 'PENDING', providerRef: null }, null) === 'confirm')
check('replay on PAID -> already-paid (no writes, no events)',
  decideConfirmation({ paymentStatus: 'PAID', providerRef: 'cs_1' }, 'cs_1') === 'already-paid')
check('replay on PAID with different ref -> already-paid',
  decideConfirmation({ paymentStatus: 'PAID', providerRef: 'cs_9' }, 'cs_1') === 'already-paid')
check('FAILED -> mismatch (needs new attempt)',
  decideConfirmation({ paymentStatus: 'FAILED', providerRef: 'cs_1' }, 'cs_1') === 'mismatch')
check('EXPIRED -> mismatch (needs new attempt)',
  decideConfirmation({ paymentStatus: 'EXPIRED', providerRef: 'cs_1' }, 'cs_1') === 'mismatch')
check('stale ref on superseded attempt -> mismatch',
  decideConfirmation({ paymentStatus: 'PENDING', providerRef: 'cs_2' }, 'cs_1') === 'mismatch')
check('missing booking -> missing',
  decideConfirmation(null, 'cs_1') === 'missing')

// --- late payment & amount verification ---
check('late payment on EXPIRED with free slot -> confirm',
  decideLatePayment({ paymentStatus: 'EXPIRED', providerRef: 'cs_1', depositCents: 2300 }, 2300, 'EUR', 'EUR', true) === 'confirm')
check('late payment on FAILED with free slot -> confirm',
  decideLatePayment({ paymentStatus: 'FAILED', providerRef: 'cs_1', depositCents: 2300 }, 2300, 'EUR', 'EUR', true) === 'confirm')
check('late payment on EXPIRED with taken slot -> flag-refund',
  decideLatePayment({ paymentStatus: 'EXPIRED', providerRef: 'cs_1', depositCents: 2300 }, 2300, 'EUR', 'EUR', false) === 'flag-refund')
check('late payment on FAILED with taken slot -> flag-refund',
  decideLatePayment({ paymentStatus: 'FAILED', providerRef: 'cs_1', depositCents: 2300 }, 2300, 'EUR', 'EUR', false) === 'flag-refund')
check('amount mismatch (wrong cents) -> flag-refund',
  decideLatePayment({ paymentStatus: 'PENDING', providerRef: 'cs_1', depositCents: 2300 }, 2000, 'EUR', 'EUR', true) === 'flag-refund')
check('amount mismatch (wrong currency) -> flag-refund',
  decideLatePayment({ paymentStatus: 'PENDING', providerRef: 'cs_1', depositCents: 2300 }, 2300, 'USD', 'EUR', true) === 'flag-refund')
check('isExpectedAmount helper valid',
  isExpectedAmount(2300, 'EUR', 2300, 'EUR') === true)
check('isExpectedAmount helper rejects cents diff',
  isExpectedAmount(2299, 'EUR', 2300, 'EUR') === false)
check('isExpectedAmount helper rejects currency diff',
  isExpectedAmount(2300, 'USD', 2300, 'EUR') === false)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
