import assert from 'node:assert/strict'
import test from 'node:test'

import {
  daySlotStarts,
  daysFromToday,
  isOnSlotStep,
  markAvailable,
  overlaps,
  parseDayStr,
  tzDayStr,
  tzOffsetMinutes,
  tzParts,
  wallToUtcMs,
} from '../server/utils/booking-slots.ts'

const BERLIN = 'Europe/Berlin'

test('tzDayStr renders the salon wall date across the UTC day boundary', () => {
  assert.equal(tzDayStr(Date.UTC(2026, 0, 15, 22, 59), BERLIN), '2026-01-15') // 23:59 CET
  assert.equal(tzDayStr(Date.UTC(2026, 0, 15, 23, 30), BERLIN), '2026-01-16') // 00:30 CET
})

test('tzOffsetMinutes reports CET and CEST offsets', () => {
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 0, 15, 12, 0), BERLIN), 60)
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 6, 15, 12, 0), BERLIN), 120)
})

test('wallToUtcMs converts wall time to UTC in both DST regimes', () => {
  assert.equal(wallToUtcMs(2026, 1, 15, 9, 0, BERLIN), Date.UTC(2026, 0, 15, 8, 0))
  assert.equal(wallToUtcMs(2026, 7, 15, 9, 0, BERLIN), Date.UTC(2026, 6, 15, 7, 0))
  // 2026-03-29: 02:00 CET jumps to 03:00 CEST.
  assert.equal(wallToUtcMs(2026, 3, 29, 3, 0, BERLIN), Date.UTC(2026, 2, 29, 1, 0))
  // 2026-10-25: 03:00 CEST falls back to 02:00 CET.
  assert.equal(wallToUtcMs(2026, 10, 25, 2, 0, BERLIN), Date.UTC(2026, 9, 25, 0, 0))
})

test('wallToUtcMs round-trips through tzParts', () => {
  const instant = wallToUtcMs(2026, 12, 24, 18, 30, BERLIN)
  const parts = tzParts(instant, BERLIN)
  assert.equal(parts.year, 2026)
  assert.equal(parts.month, 12)
  assert.equal(parts.day, 24)
  assert.equal(parts.hour, 18)
  assert.equal(parts.minute, 30)
})

test('parseDayStr accepts strict YYYY-MM-DD and rejects anything else', () => {
  assert.deepEqual(parseDayStr('2026-10-28'), { year: 2026, month: 10, day: 28 })
  assert.equal(parseDayStr('2026-1-1'), null)
  assert.equal(parseDayStr('2026-13-01'), null)
  assert.equal(parseDayStr('2026-00-10'), null)
  assert.equal(parseDayStr('2026-02-32'), null)
  assert.equal(parseDayStr(''), null)
})

test('daysFromToday is date-only and signed', () => {
  assert.equal(daysFromToday('2026-10-28', '2026-10-28'), 0)
  assert.equal(daysFromToday('2026-11-01', '2026-10-28'), 4)
  assert.equal(daysFromToday('2026-10-24', '2026-10-28'), -4)
  assert.equal(daysFromToday('2027-01-01', '2026-12-31'), 1)
})

test('daySlotStarts builds the on-grid future slots for a salon day', () => {
  const now = Date.UTC(2026, 6, 1, 0, 0)
  const slots = daySlotStarts({
    dayStr: '2026-07-01',
    openMin: 9 * 60,
    closeMin: 12 * 60,
    stepMin: 30,
    durationMin: 60,
    nowUtcMs: now,
    tz: BERLIN,
  })
  assert.equal(slots.length, 5) // 09:00 … 11:00, each 60 min before 12:00
  assert.equal(slots[0], Date.UTC(2026, 6, 1, 7, 0)) // 09:00 CEST
  assert.equal(slots.at(-1), Date.UTC(2026, 6, 1, 9, 0)) // 11:00 CEST
})

test('daySlotStarts drops slots that already started', () => {
  const slots = daySlotStarts({
    dayStr: '2026-07-01',
    openMin: 9 * 60,
    closeMin: 12 * 60,
    stepMin: 30,
    durationMin: 60,
    nowUtcMs: Date.UTC(2026, 6, 1, 8, 0), // 10:00 CEST
    tz: BERLIN,
  })
  assert.equal(slots.length, 2) // 10:30 and 11:00
  assert.equal(slots[0], Date.UTC(2026, 6, 1, 8, 30))
})

test('daySlotStarts returns nothing for invalid input or impossible durations', () => {
  const base = {
    dayStr: '2026-07-01',
    openMin: 540,
    closeMin: 720,
    stepMin: 30,
    durationMin: 60,
    nowUtcMs: 0,
    tz: BERLIN,
  }
  assert.deepEqual(daySlotStarts({ ...base, dayStr: 'nope' }), [])
  assert.deepEqual(daySlotStarts({ ...base, stepMin: 0 }), [])
  assert.deepEqual(daySlotStarts({ ...base, durationMin: 0 }), [])
  assert.deepEqual(daySlotStarts({ ...base, durationMin: 600 }), [])
})

test('overlaps is half-open', () => {
  assert.equal(overlaps(0, 10, 10, 20), false)
  assert.equal(overlaps(10, 20, 0, 10), false)
  assert.equal(overlaps(0, 11, 10, 20), true)
  assert.equal(overlaps(5, 15, 0, 20), true)
  assert.equal(overlaps(0, 100, 40, 50), true)
})

test('markAvailable blocks every slot touching a busy interval', () => {
  const slotStarts = [
    Date.UTC(2026, 6, 1, 7, 0), // 09:00
    Date.UTC(2026, 6, 1, 7, 30), // 09:30
    Date.UTC(2026, 6, 1, 8, 0), // 10:00
    Date.UTC(2026, 6, 1, 8, 30), // 10:30
    Date.UTC(2026, 6, 1, 9, 0), // 11:00
  ]
  const busy = [{ start: Date.UTC(2026, 6, 1, 7, 30), end: Date.UTC(2026, 6, 1, 8, 30) }]
  assert.deepEqual(markAvailable(slotStarts, busy, 60), [false, false, false, true, true])
  assert.deepEqual(markAvailable(slotStarts, [], 60), [true, true, true, true, true])
})

test('isOnSlotStep only accepts grid positions on the requested salon day', () => {
  const nine = Date.UTC(2026, 6, 1, 7, 0)
  assert.equal(isOnSlotStep(nine, '2026-07-01', 540, 30, BERLIN), true)
  assert.equal(isOnSlotStep(nine + 30 * 60000, '2026-07-01', 540, 30, BERLIN), true)
  assert.equal(isOnSlotStep(nine + 15 * 60000, '2026-07-01', 540, 30, BERLIN), false)
  assert.equal(isOnSlotStep(nine, '2026-07-02', 540, 30, BERLIN), false)
  assert.equal(isOnSlotStep(nine, '2026-07-01', 540, 0, BERLIN), false)
})
