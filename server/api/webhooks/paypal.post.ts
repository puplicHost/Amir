import { decryptData } from '../../utils/encryption'
import { paypalVerifyWebhook } from '../../utils/paypal'
import { confirmBookingPaid, finalizePaidBooking, getBookingSettings } from '../../utils/booking-payments'
import { eurToCents } from '../../../shared/booking'

// PayPal webhook: PAYMENT.CAPTURE.COMPLETED → confirm deposit PAID.
// Signature verified server-side via PayPal's verify endpoint.
// Replays are idempotent (see Stripe webhook).
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as any
  const headers = getRequestHeaders(event)
  const required = [
    'paypal-transmission-id',
    'paypal-transmission-time',
    'paypal-cert-url',
    'paypal-auth-algo',
    'paypal-transmission-sig',
  ]
  for (const h of required) {
    if (!headers[h]) throw createError({ statusCode: 400, statusMessage: 'Missing webhook signature' })
  }

  const settings = await getBookingSettings()
  const s = await prisma.siteSettings.findFirst()
  if (!s?.paypalEnabled || !s?.paypalClientId || !s?.paypalSecret || !s?.paypalWebhookId) {
    throw createError({ statusCode: 400, statusMessage: 'PayPal webhook not configured' })
  }
  let secret: string
  let webhookId: string
  try {
    secret = decryptData(s.paypalSecret)
    webhookId = decryptData(s.paypalWebhookId)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'PayPal webhook not configured' })
  }

  const verified = await paypalVerifyWebhook({
    clientId: s.paypalClientId,
    secret,
    mode: s.paypalMode || 'sandbox',
    webhookId,
    transmissionId: headers['paypal-transmission-id'] as string,
    transmissionTime: headers['paypal-transmission-time'] as string,
    certUrl: headers['paypal-cert-url'] as string,
    authAlgo: headers['paypal-auth-algo'] as string,
    transmissionSig: headers['paypal-transmission-sig'] as string,
    webhookEvent: body,
  }).catch(() => false)
  if (!verified) throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })

  if (body?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const customId = body?.resource?.custom_id as string | undefined
    const captureId = body?.resource?.id as string | undefined
    const amountVal = body?.resource?.amount?.value as string | undefined
    const currencyCode = body?.resource?.amount?.currency_code as string | undefined
    const proof = {
      amountCents: amountVal ? eurToCents(amountVal) : null,
      currency: currencyCode || null,
    }
    if (customId) {
      const res = await confirmBookingPaid(customId, captureId || null, proof)
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
