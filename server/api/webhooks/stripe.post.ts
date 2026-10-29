import {
  confirmBookingPaid,
  finalizePaidBooking,
  getBookingSettings,
  getStripeConfig,
} from '../../utils/booking-payments'

// Stripe webhook: checkout.session.completed / async_payment_succeeded →
// confirmed deposit. Signature is verified against the RAW body using the
// configured webhook secret. Replays are idempotent in confirmBookingPaid.
export default defineEventHandler(async (event) => {
  const sig = getRequestHeader(event, 'stripe-signature')
  const raw = await readRawBody(event)
  if (!sig || !raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing webhook signature' })
  }

  const stripe = await getStripeConfig()
  if (!stripe.webhookSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Stripe webhook not configured' })
  }

  let stripeEvent: any
  try {
    stripeEvent = stripe.client.webhooks.constructEvent(raw, sig, stripe.webhookSecret)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })
  }

  const settings = await getBookingSettings()

  const confirmPaidSession = async (session: {
    id?: string
    payment_status?: string | null
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
    const res = await confirmBookingPaid(bookingId, session?.id || null, proof, 'stripe')
    if (res.decision === 'confirm' && res.booking) {
      // CAPI/mail/admin fan-out runs off the ACK path; never rejects.
      event.waitUntil(finalizePaidBooking({
        bookingId: res.booking.id,
        depositCents: res.booking.depositCents,
        currency: settings.currency,
      }))
    }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as { payment_status?: string }
    // Delayed payment methods complete unpaid; async_payment_succeeded follows.
    // Only an explicitly paid session may confirm a booking.
    if (session.payment_status !== 'paid') return { received: true }
    await confirmPaidSession(stripeEvent.data.object as any)
  }
  if (stripeEvent.type === 'checkout.session.async_payment_succeeded') {
    await confirmPaidSession(stripeEvent.data.object as any)
  }
  if (stripeEvent.type === 'checkout.session.expired') {
    const session = stripeEvent.data.object as { id?: string }
    if (session?.id) {
      await prisma.booking.updateMany({
        where: { providerRef: session.id, paymentProvider: 'stripe', paymentStatus: 'PENDING' },
        data: { paymentStatus: 'EXPIRED', holdExpiresAt: null },
      }).catch(() => null)
    }
  }

  // Refund webhooks resolve pending refund rows by the gateway refund id.
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
    if (refund?.id) await markRefund(refund.id, refund.status === 'succeeded')
  }

  return { received: true }
})
