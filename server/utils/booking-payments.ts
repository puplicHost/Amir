// Booking payment backend (Phase 2c): settings, holds, confirmation.
// Amounts/currency always come from server-side snapshots — never the client.
import Stripe from 'stripe'
import { decryptData } from './encryption.ts'
import { decideConfirmation, isExpectedAmount } from './booking-confirm.ts'
import { sendMetaCapiEvent } from './meta-capi.ts'
import { notifyAdmins } from './admin-notifications.ts'
import { overlaps, tzDayStr } from './booking-slots.ts'

export interface BookingSettings {
  slotStepMin: number
  holdTtlMin: number
  depositPercent: number
  timezone: string
  currency: string
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const s = await prisma.siteSettings.findFirst()
  return {
    slotStepMin: s?.slotStepMin ?? 15,
    holdTtlMin: s?.holdTtlMin ?? 20,
    depositPercent: s?.depositPercent ?? 50,
    timezone: s?.timezone || 'Europe/Berlin',
    currency: s?.defaultCurrency || 'EUR',
  }
}

export interface GatewayStatus {
  stripe: boolean
  paypal: boolean
}

/** Which gateways can actually take money right now (switch on + keys stored). */
export async function getGatewayStatus(): Promise<GatewayStatus> {
  const s = await prisma.siteSettings.findFirst()
  return {
    stripe: !!s?.stripeEnabled && !!s?.stripePublishableKey && !!s?.stripeSecretKey,
    paypal: !!s?.paypalEnabled && !!s?.paypalClientId && !!s?.paypalSecret,
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

/** Stripe client from encrypted settings. Throws 503 when not configured. */
export async function getStripeConfig(): Promise<StripeConfig> {
  const s = await prisma.siteSettings.findFirst()
  if (!s?.stripeEnabled || !s?.stripePublishableKey || !s?.stripeSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe not configured' })
  }
  const secretKey = mustDecrypt('Stripe secret key', s.stripeSecretKey)
  return {
    client: new Stripe(secretKey),
    publishableKey: s.stripePublishableKey,
    webhookSecret: s.stripeWebhookSecret ? mustDecrypt('Stripe webhook secret', s.stripeWebhookSecret) : null,
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
  const s = await prisma.siteSettings.findFirst()
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
  } | null
}

export interface PaymentProof {
  amountCents: number | null
  currency: string | null
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
 * Idempotent confirmation core shared by Stripe webhook, PayPal return and
 * PayPal webhook. Verified money is never silently ignored:
 * - replay on PAID → already-paid (zero writes, zero side effects)
 * - amount/currency mismatch → flag-refund (recorded + admin notified, never confirmed)
 * - PENDING → guarded PENDING→PAID flip (lost race → already-paid)
 * - EXPIRED/FAILED → slot re-checked inside the advisory lock: free → PAID,
 *   taken → money record kept (providerRef) + needsRefund + admin notified
 */
export async function confirmBookingPaid(
  bookingId: string, providerRef: string | null, proof: PaymentProof | null = null,
): Promise<ConfirmResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return { decision: 'missing', booking: null }
  if (booking.paymentStatus === 'PAID') return { decision: 'already-paid', booking: null }

  const settings = await getBookingSettings()
  if (proof && !isExpectedAmount(proof.amountCents, proof.currency, booking.depositCents, settings.currency)) {
    await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
    return { decision: 'flag-refund', booking: null }
  }

  if (booking.paymentStatus === 'PENDING') {
    if (providerRef && booking.providerRef && providerRef !== booking.providerRef) {
      // Verified money for a superseded attempt while a newer one is active:
      // flag without clobbering the current attempt's reference.
      await flagForRefund(booking.id, null, booking.bookingNumber, booking.depositCents)
      return { decision: 'flag-refund', booking: null }
    }
    const flipped = await prisma.booking.updateMany({
      where: { id: booking.id, paymentStatus: 'PENDING' },
      data: {
        paymentStatus: 'PAID',
        ...(providerRef ? { providerRef } : {}),
        holdExpiresAt: null,
        needsRefund: false,
      },
    })
    if (flipped.count === 0) return { decision: 'already-paid', booking: null }
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } })
    return {
      decision: 'confirm',
      booking: fresh
        ? {
            id: fresh.id,
            bookingNumber: fresh.bookingNumber,
            serviceId: fresh.serviceId,
            paymentStatus: fresh.paymentStatus,
            providerRef: fresh.providerRef,
            depositCents: fresh.depositCents,
            startsAt: fresh.startsAt,
          }
        : null,
    }
  }

  if (booking.paymentStatus === 'EXPIRED' || booking.paymentStatus === 'FAILED') {
    const startMs = booking.startsAt.getTime()
    const endMs = startMs + booking.durationMinSnapshot * 60000
    const now = new Date()
    const dayStr = tzDayStr(startMs, settings.timezone)
    const free = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.serviceId}), hashtext(${dayStr}))`
      const candidates = await tx.booking.findMany({
        where: {
          serviceId: booking.serviceId,
          startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
          id: { not: booking.id },
          OR: [
            { paymentStatus: 'PAID' },
            { paymentStatus: 'PENDING', holdExpiresAt: { gt: now } },
          ],
        },
        select: { startsAt: true, durationMinSnapshot: true },
      })
      const isClash = candidates.some((c) => {
        const cEnd = c.startsAt.getTime() + c.durationMinSnapshot * 60000
        return overlaps(startMs, endMs, c.startsAt.getTime(), cEnd)
      })
      return !isClash
    })
    if (!free) {
      await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
      return { decision: 'flag-refund', booking: null }
    }
    const flipped = await prisma.booking.updateMany({
      where: { id: booking.id, paymentStatus: { in: ['EXPIRED', 'FAILED'] } },
      data: {
        paymentStatus: 'PAID',
        ...(providerRef ? { providerRef } : {}),
        holdExpiresAt: null,
        needsRefund: false,
      },
    })
    if (flipped.count === 0) return { decision: 'already-paid', booking: null }
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } })
    return {
      decision: 'confirm',
      booking: fresh
        ? {
            id: fresh.id,
            bookingNumber: fresh.bookingNumber,
            serviceId: fresh.serviceId,
            paymentStatus: fresh.paymentStatus,
            providerRef: fresh.providerRef,
            depositCents: fresh.depositCents,
            startsAt: fresh.startsAt,
          }
        : null,
    }
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
    await sendMetaCapiEvent({
      eventName: 'Purchase',
      eventId: purchaseEventId(input.bookingId),
      value: input.depositCents / 100,
      currency: input.currency,
    })

    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { service: { select: { name: true } } },
    })
    if (booking) {
      const dtBerlin = new Date(booking.startsAt).toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
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
        bodyEn: `${booking.service.name} · ${dtBerlin}`,
        bodyAr: `${booking.service.name} · ${dtBerlin}`,
      })
    }
  }
  catch (e) {
    console.warn('[booking] finalize side effects failed:', (e as Error)?.message || e)
  }
}
