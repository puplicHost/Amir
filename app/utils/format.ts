/**
 * Centralized formatting utilities for AMIR Frisur & Kosmetik Studio.
 * - Currency: EUR formatted in German locale (de-DE).
 * - Dates/times: the salon timezone configured in admin settings
 *   (default Europe/Berlin). AUDIT P2-05: never hardcode the zone at call
 *   sites; pass it in from settings/API responses.
 */

export const DEFAULT_SALON_TIMEZONE = 'Europe/Berlin'

const LOCALE_BY_APP: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  ar: 'ar-EG',
}

/** Map an app locale (de/en/ar) to an Intl locale. */
export function intlLocale(appLocale: string | undefined | null): string {
  return LOCALE_BY_APP[appLocale || 'de'] || 'de-DE'
}

/**
 * Format a price number or string into a clean German EUR price.
 * e.g., 28 -> "28,00 €", or prefix with "ab" if starting price.
 */
export function formatPrice(amount: number | string | null | undefined, options: { ab?: boolean, fractionDigits?: number } = {}): string {
  if (amount === null || amount === undefined || amount === '') return ''
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(num)) return String(amount)

  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: options.fractionDigits !== undefined ? options.fractionDigits : (Number.isInteger(num) ? 0 : 2),
    maximumFractionDigits: options.fractionDigits !== undefined ? options.fractionDigits : 2,
  }).format(num)

  return options.ab ? `ab ${formatted}` : formatted
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}

/** Format a date in the salon timezone. */
export function formatDateInZone(
  date: Date | string | number,
  timeZone: string = DEFAULT_SALON_TIMEZONE,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
  locale = 'de-DE',
): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(d)
}

/** Format a time (HH:mm) in the salon timezone. */
export function formatTimeInZone(
  date: Date | string | number,
  timeZone: string = DEFAULT_SALON_TIMEZONE,
  locale = 'de-DE',
): string {
  return formatDateInZone(date, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }, locale)
}

/** Format date + time in the salon timezone (long weekday/month). */
export function formatDateTime(
  date: Date | string | number,
  locale = 'de-DE',
  timeZone: string = DEFAULT_SALON_TIMEZONE,
): string {
  return formatDateInZone(date, timeZone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }, locale)
}

/** Backwards-compatible alias (older components expect the Berlin name). */
export function formatDateBerlin(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_SALON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
  locale = 'de-DE',
): string {
  return formatDateInZone(date, options.timeZone || DEFAULT_SALON_TIMEZONE, options, locale)
}

/** Backwards-compatible alias. */
export function formatTimeBerlin(date: Date | string | number, locale = 'de-DE'): string {
  return formatTimeInZone(date, DEFAULT_SALON_TIMEZONE, locale)
}

/** Today's calendar date (YYYY-MM-DD) in the salon timezone. */
export function todayInZone(timeZone: string = DEFAULT_SALON_TIMEZONE, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Backwards-compatible alias. */
export function todayBerlinISO(now: Date = new Date()): string {
  return todayInZone(DEFAULT_SALON_TIMEZONE, now)
}

/**
 * Add whole days to a YYYY-MM-DD calendar date. Pure UTC arithmetic on a
 * date-only value, so DST transitions cannot shift the result.
 */
export function addDaysToDayStr(dayStr: string, days: number): string {
  const [y, m, d] = dayStr.split('-').map(Number)
  if (!y || !m || !d) return dayStr
  const base = Date.UTC(y, m - 1, d)
  const next = new Date(base + Math.trunc(days) * 86400000)
  return next.toISOString().slice(0, 10)
}
