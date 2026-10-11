// Pure payment-confirmation decision (Phase 2c). No imports: unit-testable.
// Webhooks and return handlers MUST route through decideConfirmation so a
// replayed event can never mutate a PAID booking or re-fire side effects.

export type ConfirmDecision = 'confirm' | 'already-paid' | 'mismatch' | 'missing'

export interface KnownBooking {
  paymentStatus: string
  providerRef: string | null
}

/**
 * - missing booking → 'missing'
 * - already PAID → 'already-paid' (never touch, never re-notify)
 * - not PENDING (FAILED/EXPIRED/...) → 'mismatch' (needs a NEW attempt)
 * - PENDING but incoming ref names a different attempt → 'mismatch'
 *   (stale event for a superseded payment attempt)
 * - otherwise → 'confirm'
 */
export function decideConfirmation(
  booking: KnownBooking | null, incomingRef: string | null,
): ConfirmDecision {
  if (!booking) return 'missing'
  if (booking.paymentStatus === 'PAID') return 'already-paid'
  if (booking.paymentStatus !== 'PENDING') return 'mismatch'
  if (incomingRef && booking.providerRef && incomingRef !== booking.providerRef) return 'mismatch'
  return 'confirm'
}

export type LateDecision = 'confirm' | 'flag-refund' | 'already-paid' | 'mismatch' | 'missing'

/** Paid amount/currency must equal the booking's deposit snapshot exactly. */
export function isExpectedAmount(
  paidCents: number | null, currency: string | null, depositCents: number, expectedCurrency: string,
): boolean {
  if (paidCents === null || !currency) return false
  return paidCents === depositCents && currency.toUpperCase() === expectedCurrency.toUpperCase()
}

/**
 * Late-payment decision for verified money arriving on a non-PENDING booking
 * (EXPIRED/FAILED hold lapsed or earlier attempt failed):
 * - missing / already PAID → same as decideConfirmation
 * - amount or currency mismatch → 'flag-refund' (record + flag, never confirm)
 * - PENDING → 'confirm' (normal path)
 * - EXPIRED/FAILED + slot still free → 'confirm' (honor it)
 * - EXPIRED/FAILED + slot taken → 'flag-refund' (keep money record, flag)
 * slotFree comes from a locked slot re-check by the caller.
 */
export function decideLatePayment(
  booking: (KnownBooking & { depositCents: number }) | null,
  paidCents: number | null,
  currency: string | null,
  expectedCurrency: string,
  slotFree: boolean,
): LateDecision {
  if (!booking) return 'missing'
  if (booking.paymentStatus === 'PAID') return 'already-paid'
  if (!isExpectedAmount(paidCents, currency, booking.depositCents, expectedCurrency)) return 'flag-refund'
  if (booking.paymentStatus === 'PENDING') return 'confirm'
  if (booking.paymentStatus === 'EXPIRED' || booking.paymentStatus === 'FAILED') {
    return slotFree ? 'confirm' : 'flag-refund'
  }
  return 'mismatch'
}
