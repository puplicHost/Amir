import { paypalCaptureOrder } from '../../../utils/paypal'
import { confirmBookingPaid, finalizePaidBooking, getBookingSettings, getPaypalConfig } from '../../../utils/booking-payments'
import { eurToCents } from '../../../../shared/booking'

// PayPal return URL. PAY-02: this is a fast, presentational fallback — the
// success page polls status. Confirmation is ALSO driven by the
// CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED webhooks, so a buyer who
// never returns is still captured + confirmed server-side.
// PayPal appends ?token=<orderId>&PayerID=…; our token travels as ?b=.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const ours = typeof q.b === 'string' ? q.b : ''
  const orderId = typeof q.token === 'string' ? q.token : ''
  const failed = (token: string): string => `/booking/failed?token=${encodeURIComponent(token)}`
  const done = (token: string): string => `/booking/success?token=${encodeURIComponent(token)}`

  if (!ours || !orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payment reference' })
  }
  const booking = await prisma.booking.findUnique({ where: { publicToken: ours } })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (booking.paymentStatus === 'PAID') return sendRedirect(event, done(ours))
  if (booking.providerRef !== orderId || !['PENDING', 'EXPIRED', 'FAILED'].includes(booking.paymentStatus)) {
    return sendRedirect(event, failed(ours))
  }

  try {
    const settings = await getBookingSettings()
    const paypal = await getPaypalConfig()
    const capture = await paypalCaptureOrder({
      clientId: paypal.clientId,
      secret: paypal.secret,
      mode: paypal.mode,
      orderId,
    })
    if (capture.status !== 'COMPLETED') {
      // A webhook (or a parallel attempt) may have captured first; reflect the
      // authoritative booking state instead of forcing a failure.
      const fresh = await prisma.booking.findUnique({ where: { id: booking.id } })
      return sendRedirect(event, fresh?.paymentStatus === 'PAID' ? done(ours) : failed(ours))
    }
    const proof = {
      amountCents: capture.amountValue ? eurToCents(capture.amountValue) : null,
      currency: capture.currency,
      paymentId: capture.captureId,
    }
    const res = await confirmBookingPaid(booking.id, orderId, proof, 'paypal')
    if (res.decision === 'confirm' && res.booking) {
      // PAY-05: side effects off the redirect path.
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
    // Capture may have raced with the APPROVED webhook (ORDER_ALREADY_CAPTURED):
    // trust authoritative state before declaring failure. If PayPal says the
    // order is already captured but our row is not PAID yet, send the customer
    // to the success page, which polls until the webhook confirms.
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } }).catch(() => null)
    const message = String((e as Error)?.message || '')
    if (fresh?.paymentStatus === 'PAID' || /already captured|ORDER_ALREADY_CAPTURED/i.test(message)) {
      return sendRedirect(event, done(ours))
    }
    console.warn('[paypal-return]', message || e)
    return sendRedirect(event, failed(ours))
  }
})
