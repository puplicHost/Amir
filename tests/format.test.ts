import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_SALON_TIMEZONE,
  addDaysToDayStr,
  formatDateBerlin,
  formatDateInZone,
  formatDateTime,
  formatPrice,
  formatTimeBerlin,
  formatTimeInZone,
  intlLocale,
  todayBerlinISO,
  todayInZone,
} from '../app/utils/format.ts'

const BERLIN = 'Europe/Berlin'
const nbsp = (v: string) => v.replace(/\u00a0/g, ' ')

test('intlLocale maps app locales and falls back to German', () => {
  assert.equal(intlLocale('de'), 'de-DE')
  assert.equal(intlLocale('en'), 'en-US')
  assert.equal(intlLocale('ar'), 'ar-EG')
  assert.equal(intlLocale('fr'), 'de-DE')
  assert.equal(intlLocale(undefined), 'de-DE')
})

test('formatPrice renders EUR or an empty string', () => {
  assert.equal(nbsp(formatPrice(28)), '28,00 €')
  assert.equal(nbsp(formatPrice('28.5')), '28,50 €')
  assert.equal(nbsp(formatPrice(28.5, { fractionDigits: 0 })), '29 €')
  assert.equal(nbsp(formatPrice(28, { ab: true })), 'ab 28,00 €')
  assert.equal(formatPrice(null), '')
  assert.equal(formatPrice(undefined), '')
  assert.equal(formatPrice(''), '')
  assert.equal(formatPrice('not-a-number'), 'not-a-number')
})

test('formatDateInZone uses the provided salon timezone', () => {
  const instant = new Date('2026-01-15T23:30:00Z')
  assert.equal(formatDateInZone(instant, BERLIN, undefined, 'de-DE'), '16.01.2026')
  assert.equal(formatDateInZone(instant, 'UTC', undefined, 'de-DE'), '15.01.2026')
  assert.equal(formatDateInZone('not-a-date', BERLIN), '')
})

test('formatTimeInZone formats HH:mm in the salon timezone', () => {
  const instant = new Date('2026-01-15T23:30:00Z')
  assert.equal(formatTimeInZone(instant, BERLIN), '00:30')
  assert.equal(formatTimeInZone(instant, 'UTC'), '23:30')
})

test('formatDateTime includes weekday and wall time', () => {
  const rendered = formatDateTime(new Date('2026-01-15T23:30:00Z'), 'de-DE', BERLIN)
  assert.match(rendered, /16\. Januar/)
  assert.match(rendered, /00:30/)
})

test('legacy Berlin aliases stay in sync with the zone-aware helpers', () => {
  const instant = new Date('2026-01-15T23:30:00Z')
  assert.equal(formatDateBerlin(instant), formatDateInZone(instant, DEFAULT_SALON_TIMEZONE))
  assert.equal(formatTimeBerlin(instant), formatTimeInZone(instant, DEFAULT_SALON_TIMEZONE))
})

test('todayInZone returns the wall calendar date, not the UTC date', () => {
  const instant = new Date('2026-01-15T23:30:00Z')
  assert.equal(todayInZone(BERLIN, instant), '2026-01-16')
  assert.equal(todayInZone('UTC', instant), '2026-01-15')
  assert.equal(todayBerlinISO(instant), '2026-01-16')
})

test('addDaysToDayStr handles month, year and DST boundaries', () => {
  assert.equal(addDaysToDayStr('2026-10-28', 1), '2026-10-29')
  assert.equal(addDaysToDayStr('2026-03-28', 1), '2026-03-29') // DST start
  assert.equal(addDaysToDayStr('2026-10-24', 1), '2026-10-25') // DST end
  assert.equal(addDaysToDayStr('2026-12-31', 1), '2027-01-01')
  assert.equal(addDaysToDayStr('2026-01-01', -1), '2025-12-31')
  assert.equal(addDaysToDayStr('nope', 1), 'nope')
})
