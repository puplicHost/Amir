// Pure slot/overlap/time helpers for salon booking (Phase 2c).
// No imports, no I/O: safe to unit-test with plain node.
// All wall-clock math happens in the salon timezone (default Europe/Berlin,
// DST-safe via Intl); storage is always UTC milliseconds.

export interface BerlinParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 0=Sunday … 6=Saturday */
  weekday: number
}

export interface BusyInterval {
  start: number
  end: number
}

const DAY_MS = 86400000

function partsFormatter(tz: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  })
}

const WEEKDAY_NUM: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** Berlin (tz) wall-clock parts for a UTC instant. */
export function tzParts(utcMs: number, tz: string): BerlinParts {
  const map = new Map(partsFormatter(tz).formatToParts(new Date(utcMs)).map(p => [p.type, p.value]))
  const num = (k: string): number => Number.parseInt(map.get(k) || '0', 10)
  return {
    year: num('year'),
    month: num('month'),
    day: num('day'),
    hour: num('hour') % 24,
    minute: num('minute'),
    weekday: WEEKDAY_NUM[map.get('weekday') || ''] ?? 0,
  }
}

/** UTC offset of tz (minutes) at the given UTC instant. */
export function tzOffsetMinutes(utcMs: number, tz: string): number {
  const p = tzParts(utcMs, tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return Math.round((asUtc - utcMs) / 60000)
}

/** Convert tz wall time to UTC ms (iterated offset resolution, DST-safe).
 * NOTE: month is 1-based (1=January), unlike Date.UTC. */
export function wallToUtcMs(
  year: number, month: number, day: number, hour: number, minute: number, tz: string,
): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute)
  for (let i = 0; i < 3; i++) {
    guess = Date.UTC(year, month - 1, day, hour, minute) - tzOffsetMinutes(guess, tz) * 60000
  }
  return guess
}

/** YYYY-MM-DD of tz wall date for a UTC instant. */
export function tzDayStr(utcMs: number, tz: string): string {
  const p = tzParts(utcMs, tz)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function parseDayStr(day: string): { year: number, month: number, day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const dayN = Number(m[3])
  if (month < 1 || month > 12 || dayN < 1 || dayN > 31) return null
  return { year, month, day: dayN }
}

/** Whole days from todayBerlin to dayStr (date-only, tz wall). Negative = past. */
export function daysFromToday(dayStr: string, todayStr: string): number {
  return Math.round((Date.parse(`${dayStr}T00:00:00Z`) - Date.parse(`${todayStr}T00:00:00Z`)) / DAY_MS)
}

export interface DaySlotsInput {
  dayStr: string
  openMin: number
  closeMin: number
  stepMin: number
  durationMin: number
  nowUtcMs: number
  tz: string
}

/**
 * All bookable slot start instants (UTC ms) for one salon day:
 * on the step grid from openMin, fitting durationMin before closeMin,
 * strictly in the future.
 */
export function daySlotStarts(input: DaySlotsInput): number[] {
  const parsed = parseDayStr(input.dayStr)
  if (!parsed || input.stepMin <= 0 || input.durationMin <= 0) return []
  const out: number[] = []
  for (let t = input.openMin; t + input.durationMin <= input.closeMin; t += input.stepMin) {
    const h = Math.floor(t / 60)
    const m = t % 60
    const startsAt = wallToUtcMs(parsed.year, parsed.month, parsed.day, h, m, input.tz)
    if (startsAt > input.nowUtcMs) out.push(startsAt)
  }
  return out
}

/** Half-open overlap: [aStart,aEnd) vs [bStart,bEnd). */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Mark each slot start available unless [start, start+duration) hits any busy interval. */
export function markAvailable(
  slotStartsUtcMs: number[], busy: BusyInterval[], durationMin: number,
): boolean[] {
  const durMs = durationMin * 60000
  return slotStartsUtcMs.map(start =>
    !busy.some(b => overlaps(start, start + durMs, b.start, b.end)),
  )
}

/** True when a UTC instant falls exactly on the step grid of a salon day. */
export function isOnSlotStep(
  startsAtUtcMs: number, dayStr: string, openMin: number, stepMin: number, tz: string,
): boolean {
  if (stepMin <= 0) return false
  const p = tzParts(startsAtUtcMs, tz)
  const wallMin = p.hour * 60 + p.minute
  if (tzDayStr(startsAtUtcMs, tz) !== dayStr) return false
  return (wallMin - openMin) % stepMin === 0
}
