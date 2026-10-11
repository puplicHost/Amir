// Salon booking domain constants (Phase 2b).
// Single source of truth for section/status value sets used by zod schemas
// (server/utils/validate.ts) and UI code. Status columns are Strings —
// endpoints must validate against these, never accept free-form strings.

export const SERVICE_SECTIONS = ['DAMEN', 'HERREN', 'KINDER', 'KOSMETIK'] as const
export type ServiceSection = (typeof SERVICE_SECTIONS)[number]

export const PAYMENT_PROVIDERS = ['stripe', 'paypal'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'EXPIRED'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const BOOKING_STATUSES = ['UNASSIGNED', 'ASSIGNED', 'CANCELLED_BY_STAFF', 'COMPLETED'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'STAFF'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

// Server-set attention flag for verified money that could not be honored
// (late payment on a taken slot, or paid amount/currency mismatch).
// Never accepted from any client; no endpoint schema includes it.
export const BOOKING_ATTENTION_FLAGS = ['needsRefund'] as const
export type BookingAttentionFlag = (typeof BOOKING_ATTENTION_FLAGS)[number]

export const BOOKING_HOLD_TTL_MIN_DEFAULT = 20
export const BOOKING_SLOT_STEP_MIN_DEFAULT = 15
export const BOOKING_DEPOSIT_PERCENT_DEFAULT = 50
export const SERVICE_DURATION_MIN_DEFAULT = 30
export const BOOKING_HORIZON_DAYS_DEFAULT = 60

/** Deposit in EUR cents, rounded half-up (Math.round halves up for positives). */
export function depositCentsFor(priceAbCents: number, depositPercent: number): number {
  return Math.round((priceAbCents * depositPercent) / 100)
}

/** Format EUR cents as German EUR string (e.g. 4600 -> "46,00 €"). */
export function centsToEur(priceAbCents: number): string {
  return `${(priceAbCents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

/** Parse a EUR amount string/number into integer cents (half-up). */
export function eurToCents(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return Number.NaN
  return Math.round(n * 100)
}

/**
 * Normalize phone number to international format for wa.me links.
 * Strips formatting, converts 00 prefix, and rewrites German leading 0 -> 49.
 * E.g. "0171 1234567" -> "491711234567"
 *      "+49-151-998877" -> "49151998877"
 *      "0049 171 123" -> "49171123"
 */
export function normalizePhoneForWa(phone: string): string {
  let cleaned = (phone || '').replace(/\D/g, '')
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2)
  }
  else if (cleaned.startsWith('0')) {
    cleaned = `49${cleaned.slice(1)}`
  }
  return cleaned
}

export function waLink(phone: string): string {
  const norm = normalizePhoneForWa(phone)
  return norm ? `https://wa.me/${norm}` : ''
}

/** Check if slot [slotStartMs, slotEndMs) overlaps any busy interval. */
export function isStaffOverlapping(
  slotStartMs: number,
  slotEndMs: number,
  busy: { start: number, end: number }[],
): boolean {
  return busy.some(b => slotStartMs < b.end && b.start < slotEndMs)
}

/**
 * Validate booking lifecycle status transition.
 * Rules:
 * - Target ASSIGNED: allowed from UNASSIGNED (assign) or ASSIGNED (reassign),
 *   ONLY if paymentStatus === 'PAID' and !needsRefund.
 * - Target UNASSIGNED: allowed from ASSIGNED (staff cancel).
 * - Target COMPLETED: allowed from ASSIGNED.
 * - Target CANCELLED_BY_STAFF: allowed from ASSIGNED.
 * - Any transition to ASSIGNED when needsRefund is true is FORBIDDEN.
 * - Any transition to ASSIGNED when paymentStatus is not PAID is FORBIDDEN.
 */
export function isStatusTransitionAllowed(
  fromStatus: string,
  toStatus: string,
  ctx: { paymentStatus: string, needsRefund: boolean },
): boolean {
  if (toStatus === 'ASSIGNED') {
    if (ctx.paymentStatus !== 'PAID') return false
    if (ctx.needsRefund) return false
    return fromStatus === 'UNASSIGNED' || fromStatus === 'ASSIGNED'
  }
  if (toStatus === 'UNASSIGNED') {
    return fromStatus === 'ASSIGNED'
  }
  if (toStatus === 'COMPLETED') {
    return fromStatus === 'ASSIGNED'
  }
  if (toStatus === 'CANCELLED_BY_STAFF') {
    return fromStatus === 'ASSIGNED'
  }
  return false
}
