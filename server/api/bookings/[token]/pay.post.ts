import { paypalCreateOrder } from '../../../utils/paypal'
import {
  getBookingSettings,
  getGatewayStatus,
  getPaypalConfig,
} from '../../../utils/booking-payments'
import { bookingPaySchema, parseBody } from '../../../utils/validate'
import { getSiteSettings } from '../../../utils/site-settings'

// Create a NEW PayPal payment attempt for a PENDING booking. Retries always
// mint a fresh order — a PAID booking is never mutated.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') || ''
  await parseBody(event, bookingPaySchema)
  const settings = await getBookingSettings()

  const booking = await prisma.booking.findUnique({
    where: { publicToken: token },
  })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (booking.paymentStatus === 'PAID') {
    throw createError({ statusCode: 409, statusMessage: 'Booking is already paid' })
  }
  if (booking.paymentStatus !== 'PENDING') {
    throw createError({ statusCode: 409, statusMessage: 'Booking needs a new slot' })
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= Date.now()) {
    await prisma.booking.update({
      where: { id: booking.id, paymentStatus: 'PENDING' },
      data: { paymentStatus: 'EXPIRED' },
    }).catch(() => null)
    throw createError({ statusCode: 410, statusMessage: 'Payment hold expired — please pick a new slot' })
  }

  const gateways = await getGatewayStatus()
  if (!gateways.paypal) {
    throw createError({ statusCode: 409, statusMessage: 'Online payment is currently unavailable — please contact the salon' })
  }

  const origin = getRequestURL(event).origin
  const cancelUrl = `${origin}/booking/failed?token=${booking.publicToken}`

  const paypal = await getPaypalConfig()
  const order = await paypalCreateOrder({
    clientId: paypal.clientId,
    secret: paypal.secret,
    mode: paypal.mode,
    depositCents: booking.depositCents,
    currency: settings.currency,
    customId: booking.id,
    returnUrl: `${origin}/api/bookings/paypal/return?b=${booking.publicToken}`,
    cancelUrl,
    brandName: (await getSiteSettings())?.businessName || 'Amir',
  })
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, paymentStatus: 'PENDING' },
    data: { paymentProvider: 'paypal', providerRef: order.id },
  })
  if (updated.count === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Booking changed — please retry' })
  }
  return { redirectUrl: order.approveUrl }
})
