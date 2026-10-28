/**
 * Centralized formatting utilities for AMIR Frisur & Kosmetik Studio.
 * - Currency: EUR formatted in German locale (de-DE).
 * - Timezone: Europe/Berlin for all salon operational dates and times.
 */

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

/**
 * Format a date in Europe/Berlin timezone.
 */
export function formatDateBerlin(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
  locale = 'de-DE',
): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { timeZone: 'Europe/Berlin', ...options }).format(d)
}

/**
 * Format time in Europe/Berlin timezone (HH:mm).
 */
export function formatTimeBerlin(date: Date | string | number, locale = 'de-DE'): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * Today's calendar date (YYYY-MM-DD) in Europe/Berlin.
 * Use for date-only defaults instead of UTC ISO slices, which shift the
 * date backwards for local times between 00:00 and the UTC offset.
 */
export function todayBerlinISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
