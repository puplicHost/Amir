// Phase 2d unit checks — pure functions only, no DB, no network.
// Run: node scripts/verify-2d.mjs
import {
  normalizePhoneForWa,
  waLink,
  isStaffOverlapping,
  isStatusTransitionAllowed,
} from '../shared/booking.ts'

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

// ── 1. Phone to WhatsApp normalization ──
check('German local phone 0171 1234567 -> 491711234567',
  normalizePhoneForWa('0171 1234567') === '491711234567')
check('German local phone with dash 0151-998877 -> 49151998877',
  normalizePhoneForWa('0151-998877') === '49151998877')
check('International format with plus +49 171 1234567 -> 491711234567',
  normalizePhoneForWa('+49 171 1234567') === '491711234567')
check('Double zero prefix 0049 171 1234567 -> 491711234567',
  normalizePhoneForWa('0049 171 1234567') === '491711234567')
check('International non-German +20 101 2345678 -> 201012345678',
  normalizePhoneForWa('+20 101 2345678') === '201012345678')
check('waLink creates valid URL',
  waLink('0171 1234567') === 'https://wa.me/491711234567')
check('waLink handles empty input gracefully',
  waLink('') === '')

// ── 2. Staff overlap detection ──
const busy = [
  { start: 1000, end: 2000 },
  { start: 3000, end: 4000 },
]
check('Overlapping middle slot detected',
  isStaffOverlapping(1500, 2500, busy) === true)
check('Enclosed slot detected',
  isStaffOverlapping(1100, 1900, busy) === true)
check('Enclosing slot detected',
  isStaffOverlapping(500, 2500, busy) === true)
check('Touching upper boundary is NOT overlap (half-open [start, end))',
  isStaffOverlapping(2000, 3000, busy) === false)
check('Touching lower boundary is NOT overlap',
  isStaffOverlapping(500, 1000, busy) === false)
check('Free interval between bookings is NOT overlap',
  isStaffOverlapping(2100, 2900, busy) === false)
check('Empty busy list has no overlap',
  isStaffOverlapping(1000, 2000, []) === false)

// ── 3. Status transitions allowed / forbidden ──
// Assign / Reassign to ASSIGNED
check('Assign from UNASSIGNED when PAID and clean -> allowed',
  isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === true)
check('Reassign from ASSIGNED when PAID and clean -> allowed',
  isStatusTransitionAllowed('ASSIGNED', 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === true)
check('Assign FORBIDDEN when payment is PENDING',
  isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', { paymentStatus: 'PENDING', needsRefund: false }) === false)
check('Assign FORBIDDEN when payment is FAILED',
  isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', { paymentStatus: 'FAILED', needsRefund: false }) === false)
check('Assign FORBIDDEN when needsRefund is true even if PAID',
  isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: true }) === false)
check('Assign FORBIDDEN from COMPLETED',
  isStatusTransitionAllowed('COMPLETED', 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === false)
check('Assign FORBIDDEN from CANCELLED_BY_STAFF',
  isStatusTransitionAllowed('CANCELLED_BY_STAFF', 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === false)

// Staff Cancel to UNASSIGNED
check('Staff cancel from ASSIGNED -> allowed',
  isStatusTransitionAllowed('ASSIGNED', 'UNASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === true)
check('Staff cancel FORBIDDEN from UNASSIGNED',
  isStatusTransitionAllowed('UNASSIGNED', 'UNASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === false)
check('Staff cancel FORBIDDEN from COMPLETED',
  isStatusTransitionAllowed('COMPLETED', 'UNASSIGNED', { paymentStatus: 'PAID', needsRefund: false }) === false)

// Completion to COMPLETED
check('Complete from ASSIGNED -> allowed',
  isStatusTransitionAllowed('ASSIGNED', 'COMPLETED', { paymentStatus: 'PAID', needsRefund: false }) === true)
check('Complete FORBIDDEN from UNASSIGNED',
  isStatusTransitionAllowed('UNASSIGNED', 'COMPLETED', { paymentStatus: 'PAID', needsRefund: false }) === false)

// Invalid targets
check('Transition to invalid status is rejected',
  isStatusTransitionAllowed('ASSIGNED', 'UNKNOWN_STATUS', { paymentStatus: 'PAID', needsRefund: false }) === false)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
