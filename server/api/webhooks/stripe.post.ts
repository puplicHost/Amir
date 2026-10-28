import Stripe from 'stripe'
import { decryptData } from '../../utils/encryption'
import { confirmBookingPaid, finalizePaidBooking, getBookingSettings } from '../../utils/booking-payments'

// Stripe webhook: checkout.session.completed / .async_payment_succeeded →
// confirm deposit PAID. Signature verified against the RAW body. Replays are
// idempotent: confirmBookingPaid short-circuits anything already PAID.
export default defineEventHandler(async (event) => {
  const sig = getRequestHeader(event, 'stripe-signature')
  const raw = await readRawBody(event)
  if (!sig || !raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing webhook signature' })
  }

  const settings = await getBookingSettings()
  const s = await prisma.siteSettings.findFirst()
  if (!s?.stripeEnabled || !s?.stripeSecretKey || !s?.stripeWebhookSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Stripe webhook not configured' })
  }
  let stripeSecret: string
  let webhookSecret: string
  try {
    stripeSecret = decryptData(s.stripeSecretKey)
    webhookSecret = decryptData(s.stripeWebhookSecret)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Stripe webhook not configured' })
  }
  const client = new Stripe(stripeSecret)
  let stripeEvent
  try {
    stripeEvent = client.webhooks.constructEvent(raw, sig, webhookSecret)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })
  }

  // checkout.session.completed only carries money once payment_status is
  // 'paid'. With delayed payment methods (e.g. SEPA debit, deferred bank
  // transfer) the session completes with payment_status 'unpaid' — confirming
  // then would mark a deposit PAID without money. Those payments instead
  // finish asynchronously via checkout.session.async_payment_succeeded.
  // checkout.session.async_payment_failed intentionally has NO state change:
  // the booking stays PENDING until its hold expires (booking-sweeper →
  // EXPIRED, slot released) — the existing hold-expiry rules are the recovery
  // path. Do not lose the unguessable metadata.match.
  const confirmPaidSession = async (session: {
    id?: string
    amount_total?: number | null
    currency?: string | null
    payment_intent?: string | { id?: string } | null
    metadata?: Record<string, string>
  }) => {
    const bookingId = session?.metadata?.bookingId
    if (!bookingId) return
    const pi = session.payment_intent
    const proof = {
      amountCents: typeof session.amount_total === 'number' ? session.amount_total : null,
      currency: session.currency || null,
      paymentId: typeof pi === 'string' ? pi : (pi?.id || null),
    }
    const res = await confirmBookingPaid(bookingId, session?.id || null, proof)
    if (res.decision === 'confirm' && res.booking) {
      // PAY-05: CAPI/mail/admin fan-out runs off the ACK path. finalize
      // never rejects (it swallows + logs), so waitUntil is safe.
      event.waitUntil(finalizePaidBooking({
        bookingId: res.booking.id,
        depositCents: res.booking.depositCents,
        currency: settings.currency,
      }))
    }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as { payment_status?: string }
    if (session.payment_status && session.payment_status !== 'paid') return { received: true }
    await confirmPaidSession(stripeEvent.data.object as any)
  }
  if (stripeEvent.type === 'checkout.session.async_payment_succeeded') {
    await confirmPaidSession(stripeEvent.data.object as any)
  }
  // checkout.session.async_payment_failed: deliberate no-op — hold-expiry
  // (booking-sweeper → EXPIRED, slot released) is the existing recovery path.
  // Roadmap Phase 8: refund webhooks resolve pending refund rows by the
  // gateway refund id. Replays are no-ops (only PENDING rows flip).
  const markRefund = async (refundId: string, succeeded: boolean) => {
    await prisma.bookingRefund.updateMany({
      where: { provider: 'stripe', providerRef: refundId, status: 'PENDING' },
      data: { status: succeeded ? 'SUCCEEDED' : 'FAILED' },
    }).catch(() => null)
  }
  if (stripeEvent.type === 'charge.refunded') {
    const charge = stripeEvent.data.object as { refunds?: { data?: { id?: string }[] } }
    for (const r of charge?.refunds?.data || []) {
      if (r?.id) await markRefund(r.id, true)
    }
  }
  if (stripeEvent.type === 'refund.updated' || stripeEvent.type === 'refund.created') {
    const refund = stripeEvent.data.object as { id?: string, status?: string }
    if (refund?.id && (refund.status === 'succeeded' || refund.status === 'failed')) {
      await markRefund(refund.id, refund.status === 'succeeded')
    }
  }
  return { received: true }
})
