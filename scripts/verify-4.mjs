// Roadmap Phase 4 unit checks — pure functions only, no DB, no network.
// Run: node scripts/verify-4.mjs
import {
  isStaffBusy,
  slotFitsHours,
} from '../server/utils/staff-availability.ts'
import {
  BOOKING_MIN_LEAD_MIN_DEFAULT,
  STAFF_CHOICES,
} from '../shared/booking.ts'

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

// --- staff choice domain constants ---
check('STAFF_CHOICES is SPECIFIC,ANY', JSON.stringify(STAFF_CHOICES) === JSON.stringify(['SPECIFIC', 'ANY']))
check('default min lead is 120 minutes', BOOKING_MIN_LEAD_MIN_DEFAULT === 120)

// --- slotFitsHours: wall time inside day hours ---
const day = { openMin: 540, closeMin: 1080, isClosed: false } // 09:00-18:00
check('09:00 + 60min fits', slotFitsHours(540, 60, day) === true)
check('17:00 + 60min fits exactly to close', slotFitsHours(1020, 60, day) === true)
check('17:30 + 60min overflows close', slotFitsHours(1050, 60, day) === false)
check('08:45 before open rejected', slotFitsHours(525, 30, day) === false)
check('closed day rejects everything', slotFitsHours(600, 30, { ...day, isClosed: true }) === false)

// --- isStaffBusy: staff-scoped + legacy unassigned rule ---
// 9:00-10:00 booking of staff A (service S1).
const rows = [{ assignedStaffId: 'staff-a', serviceId: 's1', start: 1000, end: 2000 }]
check('same staff overlapping start is busy',
  isStaffBusy('staff-a', 's1', 1500, 2500, rows) === true)
check('same staff touching end is free (half-open)',
  isStaffBusy('staff-a', 's1', 2000, 3000, rows) === false)
check('same staff touching start is free (half-open)',
  isStaffBusy('staff-a', 's1', 0, 1000, rows) === false)
check('other staff overlapping same service is free',
  isStaffBusy('staff-b', 's1', 1500, 2500, rows) === false)

// Legacy staff-less bookings of the SAME service block every staff member.
const legacy = [{ assignedStaffId: null, serviceId: 's1', start: 1000, end: 2000 }]
check('legacy same-service overlap blocks staff A',
  isStaffBusy('staff-a', 's1', 1500, 2500, legacy) === true)
check('legacy same-service overlap blocks staff B',
  isStaffBusy('staff-b', 's1', 1500, 2500, legacy) === true)
check('legacy same-service touching end is free',
  isStaffBusy('staff-a', 's1', 2000, 3000, legacy) === false)

// Legacy bookings of a DIFFERENT service block nobody.
const legacyOther = [{ assignedStaffId: null, serviceId: 's2', start: 1000, end: 2000 }]
check('legacy other-service overlap blocks nobody',
  isStaffBusy('staff-a', 's1', 1500, 2500, legacyOther) === false)

// Empty day rows: nobody is busy.
check('empty rows are free', isStaffBusy('staff-a', 's1', 1500, 2500, []) === false)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
