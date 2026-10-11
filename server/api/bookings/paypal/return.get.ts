import { paypalCaptureOrder } from '../../../utils/paypal'
import { confirmBookingPaid, finalizePaidBooking, getBookingSettings, getPaypalConfig } from '../../../utils/booking-payments'
import { eurToCents } from '../../../../shared/booking'

// PayPal return URL (server-to-server capture + verification).
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
    if (capture.status !== 'COMPLETED') return sendRedirect(event, failed(ours))
    const proof = {
      amountCents: capture.amountValue ? eurToCents(capture.amountValue) : null,
      currency: capture.currency,
    }
    const res = await confirmBookingPaid(booking.id, orderId, proof)
    if (res.decision === 'confirm' && res.booking) {
      await finalizePaidBooking({
        bookingId: res.booking.id,
        depositCents: res.booking.depositCents,
        currency: settings.currency,
      })
      return sendRedirect(event, done(ours))
    }
    if (res.decision === 'already-paid') return sendRedirect(event, done(ours))
    return sendRedirect(event, failed(ours))
  }
  catch (e) {
    console.warn('[paypal-return]', (e as Error)?.message || e)
    return sendRedirect(event, failed(ours))
  }
})
