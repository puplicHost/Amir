// Booking payment backend (Phase 2c): settings, holds, confirmation.
// Amounts/currency always come from server-side snapshots — never the client.
// Supported online providers: Stripe Checkout (test mode) and PayPal.
import Stripe from 'stripe'
import { decryptData } from './encryption.ts'
import { decideConfirmation, isExpectedAmount } from './booking-confirm.ts'
import { dispatchBookingMarketingEvent } from './marketing/dispatch.ts'
import { notifyAdmins, notifyUser } from './admin-notifications.ts'
import { queueBookingMail } from './outbox.ts'
import { overlaps, tzDayStr } from './booking-slots.ts'
import { isTerminalBookingStatus, isStatusTransitionAllowed } from '../../shared/booking.ts'
import { getSiteSettings } from './site-settings.ts'

export interface BookingSettings {
  slotStepMin: number
  holdTtlMin: number
  depositPercent: number
  timezone: string
  currency: string
  bookingMinLeadMin: number
  cancellationWindowHours: number
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const s = await getSiteSettings()
  return {
    slotStepMin: s?.slotStepMin ?? 15,
    holdTtlMin: s?.holdTtlMin ?? 20,
    depositPercent: s?.depositPercent ?? 50,
    timezone: s?.timezone || 'Europe/Berlin',
    currency: s?.defaultCurrency || 'EUR',
    bookingMinLeadMin: (s as any)?.bookingMinLeadMin ?? 120,
    cancellationWindowHours: (s as any)?.cancellationWindowHours ?? 24,
  }
}

export interface GatewayStatus {
  stripe: boolean
  paypal: boolean
}

export interface GatewaySettings {
  stripeEnabled?: boolean | null
  stripeSecretKey?: string | null
  paypalEnabled?: boolean | null
  paypalClientId?: string | null
  paypalSecret?: string | null
}

/**
 * Pure gateway availability from stored settings.
 * Stripe Checkout is created server-side, so the secret key is sufficient;
 * the publishable key is not needed for this redirect flow. Env-only Stripe
 * credentials are handled in getGatewayStatus().
 */
export function gatewayStatusFromSettings(s: GatewaySettings | null | undefined): GatewayStatus {
  return {
    stripe: !!s?.stripeEnabled && !!s?.stripeSecretKey,
    paypal: !!s?.paypalEnabled && !!s?.paypalClientId && !!s?.paypalSecret,
  }
}

/** Which gateways can actually take money right now (switch/credentials stored or env). */
export async function getGatewayStatus(): Promise<GatewayStatus> {
  const s = await getSiteSettings()
  const stored = gatewayStatusFromSettings(s)
  // Server-side env credentials are an explicit deployment configuration and
  // enable Stripe without a database write (useful before the admin switch is set).
  // A live key is not advertised unless live mode is deliberately enabled.
  const envSecret = (process.env.STRIPE_SECRET_KEY || '').trim()
  const envStripe = Boolean(envSecret)
    && (process.env.STRIPE_ALLOW_LIVE === 'true' || !envSecret.includes('_live_'))
  return {
    stripe: envStripe || stored.stripe,
    paypal: stored.paypal,
  }
}

function mustDecrypt(label: string, stored: string | null | undefined): string {
  if (!stored) throw createError({ statusCode: 503, statusMessage: `${label} not configured` })
  try {
    const v = decryptData(stored)
    if (!v) throw new Error('empty')
    return v
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: `${label} misconfigured` })
  }
}

export interface StripeConfig {
  client: Stripe
  publishableKey: string
  webhookSecret: string | null
}

/**
 * Stripe client from server env credentials (preferred) or encrypted settings.
 * Throws 503 when not configured. Live keys are refused unless
 * STRIPE_ALLOW_LIVE=true, because this integration is Sandbox-only.
 */
export async function getStripeConfig(): Promise<StripeConfig> {
  const s = await getSiteSettings()
  const envSecret = (process.env.STRIPE_SECRET_KEY || '').trim()
  const storedSecret = s?.stripeSecretKey ? mustDecrypt('Stripe secret key', s.stripeSecretKey) : ''
  const secretKey = envSecret || storedSecret
  if (!secretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe not configured' })
  }
  if (process.env.STRIPE_ALLOW_LIVE !== 'true' && secretKey.includes('_live_')) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe live keys are disabled; use Sandbox (test) credentials' })
  }
  const envWebhook = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  const storedWebhook = s?.stripeWebhookSecret ? mustDecrypt('Stripe webhook secret', s.stripeWebhookSecret) : null
  return {
    client: new Stripe(secretKey),
    publishableKey: (process.env.STRIPE_PUBLISHABLE_KEY || s?.stripePublishableKey || '').trim(),
    webhookSecret: envWebhook || storedWebhook,
  }
}

export interface PaypalConfig {
  clientId: string
  secret: string
  webhookId: string | null
  mode: string
}

/** PayPal credentials from encrypted settings. Throws 503 when not configured. */
export async function getPaypalConfig(): Promise<PaypalConfig> {
  const s = await getSiteSettings()
  if (!s?.paypalEnabled || !s?.paypalClientId || !s?.paypalSecret) {
    throw createError({ statusCode: 503, statusMessage: 'PayPal not configured' })
  }
  return {
    clientId: s.paypalClientId,
    secret: mustDecrypt('PayPal secret', s.paypalSecret),
    webhookId: s.paypalWebhookId ? mustDecrypt('PayPal webhook ID', s.paypalWebhookId) : null,
    mode: s.paypalMode || 'sandbox',
  }
}

/** Expire PENDING bookings whose hold lapsed. Returns expired count. */
export async function expireHolds(now: Date = new Date()): Promise<number> {
  const r = await prisma.booking.updateMany({
    where: { paymentStatus: 'PENDING', holdExpiresAt: { lt: now } },
    data: { paymentStatus: 'EXPIRED' },
  })
  return r.count
}

export function newBookingNumber(): string {
  const d = new Date()
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const rand = cryptoRandom(3).toUpperCase()
  return `BK-${ymd}-${rand}`
}

export function newPublicToken(): string {
  return cryptoRandom(16)
}

export function newIdempotencyKey(): string {
  return cryptoRandom(16)
}

function cryptoRandom(bytes: number): string {
  // WebCrypto is available in Node and all Nitro runtimes.
  const buf = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ConfirmResult {
  decision: 'confirm' | 'already-paid' | 'mismatch' | 'missing' | 'flag-refund'
  booking: {
    id: string
    bookingNumber: string
    serviceId: string
    paymentStatus: string
    providerRef: string | null
    depositCents: number
    startsAt: Date
    assignedStaffId: string | null
    status: string
  } | null
}

function toConfirmBooking(b: {
  id: string
  bookingNumber: string
  serviceId: string
  paymentStatus: string
  providerRef: string | null
  depositCents: number
  startsAt: Date
  assignedStaffId: string | null
  status: string
}): ConfirmResult['booking'] {
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    serviceId: b.serviceId,
    paymentStatus: b.paymentStatus,
    providerRef: b.providerRef,
    depositCents: b.depositCents,
    startsAt: b.startsAt,
    assignedStaffId: b.assignedStaffId,
    status: b.status,
  }
}

export interface PaymentProof {
  amountCents: number | null
  currency: string | null
  /** Stripe PaymentIntent id or PayPal capture id (persisted as Booking.providerPaymentId for refunds). */
  paymentId?: string | null
}

async function flagForRefund(
  bookingId: string, providerRef: string | null, bookingNumber: string, depositCents: number,
): Promise<void> {
  await prisma.booking.updateMany({
    where: { id: bookingId, paymentStatus: { not: 'PAID' } },
    data: { ...(providerRef ? { providerRef } : {}), needsRefund: true },
  }).catch(() => null)
  await notifyAdmins({
    type: 'payment_needs_refund',
    relatedEntityId: bookingId,
    url: `/admin/bookings/${bookingId}`,
    titleEn: `Payment needs review (${bookingNumber})`,
    titleAr: `Zahlung erfordert Prüfung (${bookingNumber})`,
    bodyEn: 'Verified money arrived that could not be confirmed automatically. Check the amount/slot and refund manually.',
    bodyAr: 'Zahlung eingegangen, konnte aber nicht automatisch bestätigt werden. Bitte manuell prüfen.',
  })
}

/**
 * A second, different capture on an already-PAID booking. The original
 * payment must stay untouched, so only the attention flag is set; the primary
 * order/capture references are preserved. The new references are reported to
 * admins for manual refunding.
 */
async function flagDuplicateCharge(
  bookingId: string, bookingNumber: string, orderRef: string | null, captureRef: string | null,
): Promise<void> {
  await prisma.booking.updateMany({
    where: { id: bookingId },
    data: { needsRefund: true },
  }).catch(() => null)
  await notifyAdmins({
    type: 'payment_needs_refund',
    relatedEntityId: bookingId,
    url: `/admin/bookings/${bookingId}`,
    titleEn: `Duplicate payment needs review (${bookingNumber})`,
    titleAr: `Doppelte Zahlung erfordert Prüfung (${bookingNumber})`,
    bodyEn: `A second verified payment charge arrived${orderRef ? ` (order ${orderRef})` : ''}${captureRef ? ` (capture ${captureRef})` : ''}. The booking was already paid; refund the duplicate manually.`,
    bodyAr: `Eine zweite bestätigte Zahlung ist eingegangen${orderRef ? ` (Bestellung ${orderRef})` : ''}${captureRef ? ` (Erfassung ${captureRef})` : ''}. Die Buchung war bereits bezahlt; bitte die doppelte Zahlung manuell erstatten.`,
  })
}

/**
 * Idempotent confirmation core shared by the Stripe return/webhook handlers
 * and the PayPal return/webhook handlers. Verified money is never silently
 * ignored:
 * - replay on PAID with the same charge reference → already-paid (zero side effects)
 * - a second, different order/capture on a PAID booking → flag-refund (evidence kept)
 * - non-PayPal provider → flag-refund (never confirm another provider's booking)
 * - amount/currency mismatch → flag-refund (recorded + admin notified, never confirmed)
 * - PENDING → guarded PENDING→PAID flip (lost race → already-paid)
 * - EXPIRED/FAILED → slot re-checked inside the advisory lock: free → PAID,
 *   taken → money record kept (providerRef) + needsRefund + admin notified
 */
export async function confirmBookingPaid(
  bookingId: string,
  providerRef: string | null,
  proof: PaymentProof | null = null,
  expectedProvider: 'stripe' | 'paypal' | null = null,
): Promise<ConfirmResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return { decision: 'missing', booking: null }
  // Rows created before a pay attempt have an empty provider. A manual booking
  // or a callback from the other provider must never confirm this payment.
  const provider = (booking.paymentProvider || '').toLowerCase()
  const supported = provider === '' || provider === 'stripe' || provider === 'paypal'
  const providerMismatch = Boolean(provider && expectedProvider && provider !== expectedProvider)
  if (!supported || providerMismatch) {
    if (booking.paymentStatus === 'PAID') {
      await flagDuplicateCharge(booking.id, booking.bookingNumber, providerRef, proof?.paymentId || null)
    }
    else {
      await flagForRefund(booking.id, null, booking.bookingNumber, booking.depositCents)
    }
    return { decision: 'flag-refund', booking: null }
  }
  if (booking.paymentStatus === 'PAID') {
    // A different order or capture on an already-paid booking is a second
    // charge: keep the evidence and let an admin refund it. A replay of the
    // same charge is a no-op.
    const refDiffers = Boolean(providerRef && booking.providerRef && providerRef !== booking.providerRef)
    const captureDiffers = Boolean(
      proof?.paymentId
      && (booking as any).providerPaymentId
      && proof.paymentId !== (booking as any).providerPaymentId,
    )
    if (refDiffers || captureDiffers) {
      await flagDuplicateCharge(booking.id, booking.bookingNumber, providerRef, proof?.paymentId || null)
      return { decision: 'flag-refund', booking: null }
    }
    return { decision: 'already-paid', booking: null }
  }
  // Roadmap Phase 8: money arriving for a cancelled/closed booking can never
  // be honored — flag for manual refund instead of confirming.
  if (isTerminalBookingStatus(booking.status) || (booking as any).cancelledAt) {
    await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
    return { decision: 'flag-refund', booking: null }
  }

  const settings = await getBookingSettings()
  if (proof && !isExpectedAmount(proof.amountCents, proof.currency, booking.depositCents, settings.currency)) {
    await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
    return { decision: 'flag-refund', booking: null }
  }

  // Staff-level blocker filter shared by both paths below: the booking's own
  // staff (or its service for legacy staff-less rows) plus legacy unassigned
  // rows of the same service. Legacy rows block every staff member.
  const staffBlockerOr = booking.assignedStaffId
    ? [
        { assignedStaffId: booking.assignedStaffId, paymentStatus: 'PAID' },
        { assignedStaffId: booking.assignedStaffId, paymentStatus: 'PENDING', holdExpiresAt: { gt: new Date() } },
        { assignedStaffId: null, serviceId: booking.serviceId, paymentStatus: 'PAID' },
        { assignedStaffId: null, serviceId: booking.serviceId, paymentStatus: 'PENDING', holdExpiresAt: { gt: new Date() } },
      ]
    : [
        { serviceId: booking.serviceId, paymentStatus: 'PAID' },
        { serviceId: booking.serviceId, paymentStatus: 'PENDING', holdExpiresAt: { gt: new Date() } },
      ]

  if (booking.paymentStatus === 'PENDING') {
    if (providerRef && booking.providerRef && providerRef !== booking.providerRef) {
      // Verified money for a superseded attempt while a newer one is active:
      // flag without clobbering the current attempt's reference.
      await flagForRefund(booking.id, null, booking.bookingNumber, booking.depositCents)
      return { decision: 'flag-refund', booking: null }
    }
    const startMs = booking.startsAt.getTime()
    const endMs = startMs + booking.durationMinSnapshot * 60000
    const dayStr = tzDayStr(startMs, settings.timezone)
    // Single salon+day lock (Roadmap Phase 4): creation, assignment and
    // confirmation serialize on the same lock, so "any staff" checks spanning
    // several staff members cannot deadlock.
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('salon'), hashtext(${dayStr}))`
      // AUDIT P1-04: always re-check overlap, including legacy staff-less rows.
      // A hold that expired can free the slot before a late webhook arrives; the
      // payment must then be flagged for refund, never confirmed.
      const blockers = await tx.booking.findMany({
        where: {
          id: { not: booking.id },
          status: { not: 'CANCELLED' },
          startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
          OR: staffBlockerOr,
        },
        select: { startsAt: true, durationMinSnapshot: true },
      })
      const free = !blockers.some((c) => {
        const cEnd = c.startsAt.getTime() + c.durationMinSnapshot * 60000
        return overlaps(startMs, endMs, c.startsAt.getTime(), cEnd)
      })

      if (!free) {
        // Record verified money as unhonourable, close the hold, and preserve
        // needsRefund. The caller notifies admins after the transaction.
        const flagged = await tx.booking.updateMany({
          where: { id: booking.id, paymentStatus: 'PENDING' },
          data: {
            paymentStatus: 'EXPIRED',
            holdExpiresAt: null,
            needsRefund: true,
            ...(providerRef ? { providerRef } : {}),
            ...(proof?.paymentId ? { providerPaymentId: proof.paymentId } : {}),
          },
        })
        return flagged.count === 0 ? 'lost-race' as const : 'taken' as const
      }

      const shouldAssign = booking.status === 'UNASSIGNED' && Boolean(booking.assignedStaffId)
        && isStatusTransitionAllowed(booking.status, 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: false })
      const flipped = await tx.booking.updateMany({
        where: { id: booking.id, paymentStatus: 'PENDING' },
        data: {
          paymentStatus: 'PAID',
          ...(providerRef ? { providerRef } : {}),
          ...(proof?.paymentId ? { providerPaymentId: proof.paymentId } : {}),
          holdExpiresAt: null,
          needsRefund: false,
          ...(shouldAssign ? { status: 'ASSIGNED' } : {}),
        },
      })
      if (flipped.count === 0) return 'lost-race' as const
      if (shouldAssign) {
        await tx.bookingAssignment.create({
          data: {
            bookingId: booking.id,
            staffId: booking.assignedStaffId!,
            assignedById: 'system',
            assignedAt: new Date(),
          },
        })
      }
      return 'confirmed' as const
    })
    if (outcome === 'taken') {
      await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
      return { decision: 'flag-refund', booking: null }
    }
    if (outcome === 'lost-race') return { decision: 'already-paid', booking: null }
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } })
    return { decision: 'confirm', booking: fresh ? toConfirmBooking(fresh) : null }
  }

  if (booking.paymentStatus === 'EXPIRED' || booking.paymentStatus === 'FAILED') {
    const startMs = booking.startsAt.getTime()
    const endMs = startMs + booking.durationMinSnapshot * 60000
    const now = new Date()
    const dayStr = tzDayStr(startMs, settings.timezone)
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('salon'), hashtext(${dayStr}))`
      const candidates = await tx.booking.findMany({
        where: {
          startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
          status: { not: 'CANCELLED' },
          id: { not: booking.id },
          OR: staffBlockerOr,
        },
        select: { startsAt: true, durationMinSnapshot: true },
      })
      const isClash = candidates.some((c) => {
        const cEnd = c.startsAt.getTime() + c.durationMinSnapshot * 60000
        return overlaps(startMs, endMs, c.startsAt.getTime(), cEnd)
      })
      if (isClash) return 'taken' as const
      const shouldAssign = booking.status === 'UNASSIGNED' && Boolean(booking.assignedStaffId)
        && isStatusTransitionAllowed(booking.status, 'ASSIGNED', { paymentStatus: 'PAID', needsRefund: false })
      const flipped = await tx.booking.updateMany({
        where: { id: booking.id, paymentStatus: { in: ['EXPIRED', 'FAILED'] } },
        data: {
          paymentStatus: 'PAID',
          ...(providerRef ? { providerRef } : {}),
          ...(proof?.paymentId ? { providerPaymentId: proof.paymentId } : {}),
          holdExpiresAt: null,
          needsRefund: false,
          ...(shouldAssign ? { status: 'ASSIGNED' } : {}),
        },
      })
      if (flipped.count === 0) return 'lost-race' as const
      if (shouldAssign) {
        await tx.bookingAssignment.create({
          data: {
            bookingId: booking.id,
            staffId: booking.assignedStaffId!,
            assignedById: 'system',
            assignedAt: new Date(),
          },
        })
      }
      return 'confirmed' as const
    })
    if (outcome === 'taken') {
      await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
      return { decision: 'flag-refund', booking: null }
    }
    if (outcome === 'lost-race') return { decision: 'already-paid', booking: null }
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } })
    return { decision: 'confirm', booking: fresh ? toConfirmBooking(fresh) : null }
  }

  return { decision: 'mismatch', booking: null }
}

/**
 * Shared Purchase event id for Meta dedup: the browser Pixel (Phase 2f)
 * must send the same `purchase-<bookingId>` event_id.
 */
export function purchaseEventId(bookingId: string): string {
  return `purchase-${bookingId}`
}

/**
 * Post-confirmation side effects (Meta CAPI Purchase, deposit value, EUR).
 * Called ONLY after confirmBookingPaid resolves 'confirm' — replays never
 * reach this, so no duplicate events. Never throws.
 */
export async function finalizePaidBooking(input: {
  bookingId: string
  depositCents: number
  currency: string
}): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { service: { select: { name: true } } },
    })
    if (!booking) return

    // Server-side conversions are dispatched only after the booking has been
    // authoritatively confirmed. Start them alongside the notification/mail
    // work; awaiting the promise at the end keeps delivery tracked by the
    // caller's event.waitUntil() without delaying payment acknowledgement.
    const marketingDelivery = Promise.all([
      dispatchBookingMarketingEvent('BookingConfirmed', booking.id),
      dispatchBookingMarketingEvent('DepositPaid', booking.id, {
        value: input.depositCents / 100,
        currency: input.currency,
      }),
    ]).catch((e) => {
      console.warn('[marketing] finalize dispatch failed:', (e as Error)?.message || e)
    })

    const dtSalon = new Date(booking.startsAt).toLocaleString('de-DE', {
      timeZone: (await getSiteSettings())?.timezone || 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    await notifyAdmins({
      type: 'new_booking',
      relatedEntityId: booking.id,
      url: `/admin/bookings/${booking.id}`,
      titleEn: `New booking (${booking.bookingNumber})`,
      titleAr: `Neue Buchung (${booking.bookingNumber})`,
      bodyEn: `${booking.service.name} · ${dtSalon}`,
      bodyAr: `${booking.service.name} · ${dtSalon}`,
    })
    // Roadmap Phase 4: the customer-chosen staff member is notified
    // directly on auto-assignment (sanitized, no customer PII).
    if (booking.status === 'ASSIGNED' && booking.assignedStaffId) {
      await notifyUser(booking.assignedStaffId, {
        type: 'booking_assigned',
        relatedEntityId: booking.id,
        url: '/admin/appointments?tab=my-bookings',
        titleEn: `New booking assigned (${booking.bookingNumber})`,
        titleAr: `Neuer Termin zugewiesen (${booking.bookingNumber})`,
        bodyEn: `${booking.service.name} · ${dtSalon}`,
        bodyAr: `${booking.service.name} · ${dtSalon}`,
      })
    }
    // Roadmap Phase 7: customer confirmation mail (deduplicated outbox;
    // skipped silently when the guest left no email).
    await queueBookingMail(booking.id, 'booking_confirmed')
    await marketingDelivery
  }
  catch (e) {
    console.warn('[booking] finalize side effects failed:', (e as Error)?.message || e)
  }
}
