import Stripe from 'stripe'
import { decryptData } from '../../utils/encryption'
import { confirmBookingPaid, finalizePaidBooking, getBookingSettings } from '../../utils/booking-payments'

// Stripe webhook: checkout.session.completed → confirm deposit PAID.
// Signature verified against the RAW body. Replays are idempotent:
// confirmBookingPaid short-circuits anything already PAID.
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

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as {
      id?: string
      amount_total?: number | null
      currency?: string | null
      metadata?: Record<string, string>
    }
    const bookingId = session?.metadata?.bookingId
    if (bookingId) {
      const proof = {
        amountCents: typeof session.amount_total === 'number' ? session.amount_total : null,
        currency: session.currency || null,
      }
      const res = await confirmBookingPaid(bookingId, session?.id || null, proof)
      if (res.decision === 'confirm' && res.booking) {
        await finalizePaidBooking({
          bookingId: res.booking.id,
          depositCents: res.booking.depositCents,
          currency: settings.currency,
        })
      }
    }
  }
  return { received: true }
})
