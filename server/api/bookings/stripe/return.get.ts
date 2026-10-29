import {
  confirmBookingPaid,
  finalizePaidBooking,
  getBookingSettings,
  getStripeConfig,
} from '../../../utils/booking-payments'

// Stripe Checkout return. Stripe appends ?session_id=... to success_url.
// The query only selects the session; payment proof comes from a server-side
// Stripe API retrieval, never from the redirect itself.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const ours = typeof q.b === 'string' ? q.b : ''
  const sessionId = typeof q.session_id === 'string' ? q.session_id : ''
  const failed = (token: string): string => `/booking/failed?token=${encodeURIComponent(token)}`
  const done = (token: string): string => `/booking/success?token=${encodeURIComponent(token)}`

  if (!ours || !sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payment reference' })
  }
  const booking = await prisma.booking.findUnique({ where: { publicToken: ours } })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (booking.paymentStatus === 'PAID') return sendRedirect(event, done(ours))
  if (booking.providerRef !== sessionId || !['PENDING', 'EXPIRED', 'FAILED'].includes(booking.paymentStatus)) {
    return sendRedirect(event, failed(ours))
  }

  try {
    const settings = await getBookingSettings()
    const stripe = await getStripeConfig()
    const session = await stripe.client.checkout.sessions.retrieve(sessionId)
    const pi = session.payment_intent
    const paymentIntentId = typeof pi === 'string' ? pi : (pi?.id || null)
    const paid = session.payment_status === 'paid'
    const amountOk = session.amount_total === booking.depositCents
    const currencyOk = String(session.currency || '').toUpperCase() === settings.currency.toUpperCase()
    const bookingOk = session.metadata?.bookingId === booking.id

    if (!paid || !amountOk || !currencyOk || !bookingOk) {
      const fresh = await prisma.booking.findUnique({ where: { id: booking.id } })
      if (fresh?.paymentStatus === 'PAID') return sendRedirect(event, done(ours))
      console.warn('[stripe-return] verification failed', {
        paid, amountOk, currencyOk, bookingOk,
      })
      return sendRedirect(event, failed(ours))
    }

    const res = await confirmBookingPaid(
      booking.id,
      session.id,
      {
        amountCents: session.amount_total ?? null,
        currency: session.currency,
        paymentId: paymentIntentId,
      },
      'stripe',
    )
    if (res.decision === 'confirm' && res.booking) {
      // Side effects (mail/notifications/CAPI) run off the redirect path.
      event.waitUntil(finalizePaidBooking({
        bookingId: res.booking.id,
        depositCents: res.booking.depositCents,
        currency: settings.currency,
      }))
      return sendRedirect(event, done(ours))
    }
    if (res.decision === 'already-paid') return sendRedirect(event, done(ours))
    return sendRedirect(event, failed(ours))
  }
  catch (e) {
    // A webhook may have confirmed in parallel; trust the stored state.
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } }).catch(() => null)
    if (fresh?.paymentStatus === 'PAID') return sendRedirect(event, done(ours))
    console.warn('[stripe-return]', (e as Error)?.message || e)
    return sendRedirect(event, failed(ours))
  }
})
