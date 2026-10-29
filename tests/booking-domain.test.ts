import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BOOKING_STATUSES,
  LEGACY_TERMINAL_BOOKING_STATUSES,
  PAYMENT_PROVIDERS,
  centsToEur,
  depositCentsFor,
  eurToCents,
  isStaffOverlapping,
  isStatusTransitionAllowed,
  isTerminalBookingStatus,
  normalizePhoneForWa,
  waLink,
} from '../shared/booking.ts'

test('depositCentsFor rounds half-up and handles zero/full percent', () => {
  assert.equal(depositCentsFor(4600, 50), 2300)
  assert.equal(depositCentsFor(4599, 30), 1380) // 1379.7
  assert.equal(depositCentsFor(333, 50), 167) // 166.5 half-up
  assert.equal(depositCentsFor(0, 50), 0)
  assert.equal(depositCentsFor(9999, 100), 9999)
  assert.equal(depositCentsFor(9999, 0), 0)
})

test('centsToEur formats German EUR amounts exactly once', () => {
  const normalize = (v: string) => v.replace(/\u00a0/g, ' ')
  assert.equal(normalize(centsToEur(4600)), '46,00 €')
  assert.equal(normalize(centsToEur(0)), '0,00 €')
  assert.equal(normalize(centsToEur(123456)), '1.234,56 €')
})

test('eurToCents parses comma and dot decimal input', () => {
  assert.equal(eurToCents('12,50'), 1250)
  assert.equal(eurToCents('12.50'), 1250)
  assert.equal(eurToCents(12.5), 1250)
  assert.equal(eurToCents('0'), 0)
  assert.ok(Number.isNaN(eurToCents('abc')))
  assert.ok(Number.isNaN(eurToCents(-1)))
  assert.ok(Number.isNaN(eurToCents(Number.POSITIVE_INFINITY)))
})

test('normalizePhoneForWa converts German national and 00 prefixes', () => {
  assert.equal(normalizePhoneForWa('0171 1234567'), '491711234567')
  assert.equal(normalizePhoneForWa('+49-151-998877'), '49151998877')
  assert.equal(normalizePhoneForWa('0049 171 123'), '49171123')
  assert.equal(normalizePhoneForWa(''), '')
  assert.equal(waLink('0171 1234567'), 'https://wa.me/491711234567')
  assert.equal(waLink(''), '')
})

test('isStaffOverlapping uses half-open intervals', () => {
  const busy = [{ start: 100, end: 200 }]
  assert.equal(isStaffOverlapping(0, 100, busy), false) // touching start
  assert.equal(isStaffOverlapping(200, 300, busy), false) // touching end
  assert.equal(isStaffOverlapping(0, 101, busy), true)
  assert.equal(isStaffOverlapping(199, 300, busy), true)
  assert.equal(isStaffOverlapping(120, 150, busy), true)
})

test('booking status catalog excludes the legacy staff-cancel state', () => {
  assert.deepEqual([...BOOKING_STATUSES], ['UNASSIGNED', 'ASSIGNED', 'CANCELLED', 'COMPLETED'])
  assert.deepEqual([...LEGACY_TERMINAL_BOOKING_STATUSES], ['CANCELLED_BY_STAFF'])
  assert.equal(isTerminalBookingStatus('CANCELLED'), true)
  assert.equal(isTerminalBookingStatus('COMPLETED'), true)
  assert.equal(isTerminalBookingStatus('CANCELLED_BY_STAFF'), true)
  assert.equal(isTerminalBookingStatus('ASSIGNED'), false)
  assert.equal(isTerminalBookingStatus('UNASSIGNED'), false)
})

const paid = { paymentStatus: 'PAID', needsRefund: false }

test('assignment requires paid, non-refundable, non-terminal bookings', () => {
  assert.equal(isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', paid), true)
  assert.equal(isStatusTransitionAllowed('ASSIGNED', 'ASSIGNED', paid), true) // reassign
  assert.equal(isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', { paymentStatus: 'PENDING', needsRefund: false }), false)
  assert.equal(isStatusTransitionAllowed('UNASSIGNED', 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: true }), false)
  assert.equal(isStatusTransitionAllowed('CANCELLED', 'ASSIGNED', paid), false)
  assert.equal(isStatusTransitionAllowed('COMPLETED', 'ASSIGNED', paid), false)
  assert.equal(isStatusTransitionAllowed('CANCELLED_BY_STAFF', 'ASSIGNED', paid), false)
})

test('unassignment and completion only apply to assigned bookings', () => {
  assert.equal(isStatusTransitionAllowed('ASSIGNED', 'UNASSIGNED', paid), true)
  assert.equal(isStatusTransitionAllowed('UNASSIGNED', 'UNASSIGNED', paid), false)
  assert.equal(isStatusTransitionAllowed('CANCELLED', 'UNASSIGNED', paid), false)
  assert.equal(isStatusTransitionAllowed('ASSIGNED', 'COMPLETED', paid), true)
  assert.equal(isStatusTransitionAllowed('UNASSIGNED', 'COMPLETED', paid), false)
  assert.equal(isStatusTransitionAllowed('CANCELLED', 'COMPLETED', paid), false)
})

test('cancellation applies to active states only', () => {
  assert.equal(isStatusTransitionAllowed('UNASSIGNED', 'CANCELLED', paid), true)
  assert.equal(isStatusTransitionAllowed('ASSIGNED', 'CANCELLED', paid), true)
  assert.equal(isStatusTransitionAllowed('COMPLETED', 'CANCELLED', paid), false)
  assert.equal(isStatusTransitionAllowed('CANCELLED', 'CANCELLED', paid), false)
  assert.equal(isStatusTransitionAllowed('CANCELLED_BY_STAFF', 'CANCELLED', paid), false)
})

test('legacy staff-cancel state is never a valid target and unknown states are rejected', () => {
  assert.equal(isStatusTransitionAllowed('ASSIGNED', 'CANCELLED_BY_STAFF', paid), false)
  assert.equal(isStatusTransitionAllowed('ASSIGNED', 'WHATEVER', paid), false)
  assert.equal(isStatusTransitionAllowed('ASSIGNED', '', paid), false)
})

test('online payment provider catalog supports Stripe and PayPal', () => {
  assert.deepEqual([...PAYMENT_PROVIDERS], ['stripe', 'paypal'])
})
