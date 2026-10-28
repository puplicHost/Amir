import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decideConfirmation,
  decideLatePayment,
  isExpectedAmount,
} from '../server/utils/booking-confirm.ts'

test('isExpectedAmount requires exact cents and case-insensitive currency', () => {
  assert.equal(isExpectedAmount(2300, 'EUR', 2300, 'EUR'), true)
  assert.equal(isExpectedAmount(2300, 'eur', 2300, 'EUR'), true)
  assert.equal(isExpectedAmount(2299, 'EUR', 2300, 'EUR'), false)
  assert.equal(isExpectedAmount(2300, 'USD', 2300, 'EUR'), false)
  assert.equal(isExpectedAmount(null, 'EUR', 2300, 'EUR'), false)
  assert.equal(isExpectedAmount(2300, null, 2300, 'EUR'), false)
})

test('decideConfirmation is idempotent for a replayed paid charge', () => {
  assert.equal(decideConfirmation({ paymentStatus: 'PAID', providerRef: 'ORDER-1' }, 'ORDER-1'), 'already-paid')
})

test('decideConfirmation rejects a stale reference on a pending booking', () => {
  assert.equal(decideConfirmation({ paymentStatus: 'PENDING', providerRef: 'ORDER-2' }, 'ORDER-1'), 'mismatch')
  assert.equal(decideConfirmation({ paymentStatus: 'PENDING', providerRef: 'ORDER-1' }, 'ORDER-1'), 'confirm')
})

test('decideConfirmation treats non-pending bookings as needing a new attempt', () => {
  assert.equal(decideConfirmation({ paymentStatus: 'EXPIRED', providerRef: 'ORDER-1' }, 'ORDER-1'), 'mismatch')
  assert.equal(decideConfirmation({ paymentStatus: 'FAILED', providerRef: 'ORDER-1' }, 'ORDER-1'), 'mismatch')
  assert.equal(decideConfirmation(null, 'ORDER-1'), 'missing')
})

test('decideLatePayment honours a verified capture only when the slot is free', () => {
  const booking = { paymentStatus: 'EXPIRED', providerRef: 'ORDER-1', depositCents: 2300 }
  assert.equal(decideLatePayment(booking, 2300, 'EUR', 'EUR', true), 'confirm')
  assert.equal(decideLatePayment(booking, 2300, 'EUR', 'EUR', false), 'flag-refund')
})

test('decideLatePayment rejects amount and currency mismatches before confirming', () => {
  const booking = { paymentStatus: 'PENDING', providerRef: 'ORDER-1', depositCents: 2300 }
  assert.equal(decideLatePayment(booking, 2299, 'EUR', 'EUR', true), 'flag-refund')
  assert.equal(decideLatePayment(booking, 2300, 'USD', 'EUR', true), 'flag-refund')
  assert.equal(decideLatePayment(booking, 2300, 'EUR', 'EUR', true), 'confirm')
})

test('decideLatePayment never re-confirms a paid booking', () => {
  assert.equal(
    decideLatePayment({ paymentStatus: 'PAID', providerRef: 'ORDER-1', depositCents: 2300 }, 2300, 'EUR', 'EUR', true),
    'already-paid',
  )
})
