import { paypalCreateOrder } from '../../../utils/paypal'
import {
  getBookingSettings,
  getGatewayStatus,
  getPaypalConfig,
  getStripeConfig,
} from '../../../utils/booking-payments'
import { bookingPaySchema, parseBody } from '../../../utils/validate'

// Create a NEW payment attempt for a PENDING booking. Retries always mint a
// fresh provider session/order — a PAID booking is never mutated.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') || ''
  const body = await parseBody(event, bookingPaySchema)
  const settings = await getBookingSettings()

  const booking = await prisma.booking.findUnique({
    where: { publicToken: token },
    include: { service: { select: { name: true } } },
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
  if (!gateways.stripe && !gateways.paypal) {
    throw createError({ statusCode: 409, statusMessage: 'Online payment is currently unavailable — please contact the salon' })
  }
  if (body.provider === 'stripe' && !gateways.stripe) {
    throw createError({ statusCode: 400, statusMessage: 'Stripe is currently unavailable' })
  }
  if (body.provider === 'paypal' && !gateways.paypal) {
    throw createError({ statusCode: 400, statusMessage: 'PayPal is currently unavailable' })
  }

  const origin = getRequestURL(event).origin
  const successUrl = `${origin}/booking/success?token=${booking.publicToken}`
  const cancelUrl = `${origin}/booking/failed?token=${booking.publicToken}`

  if (body.provider === 'stripe') {
    const stripe = await getStripeConfig()
    const session = await stripe.client.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: settings.currency.toLowerCase(),
            unit_amount: booking.depositCents,
            product_data: {
              name: `Deposit — ${booking.service.name} (${booking.bookingNumber})`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: booking.customerEmail || undefined,
      metadata: { bookingId: booking.id, token: booking.publicToken },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    const updated = await prisma.booking.updateMany({
      where: { id: booking.id, paymentStatus: 'PENDING' },
      data: { paymentProvider: 'stripe', providerRef: session.id },
    })
    if (updated.count === 0 || !session.url) {
      throw createError({ statusCode: 409, statusMessage: 'Booking changed — please retry' })
    }
    return { redirectUrl: session.url }
  }

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
    brandName: (await prisma.siteSettings.findFirst())?.businessName || 'Amir',
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
