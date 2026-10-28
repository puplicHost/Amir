import { decryptData } from '../../utils/encryption'
import { paypalCaptureOrder, paypalVerifyWebhook } from '../../utils/paypal'
import { confirmBookingPaid, finalizePaidBooking, getBookingSettings } from '../../utils/booking-payments'
import { getSiteSettings } from '../../utils/site-settings'
import { eurToCents } from '../../../shared/booking'

// PayPal webhook: PAYMENT.CAPTURE.COMPLETED → confirm deposit PAID.
// Signature verified server-side via PayPal's verify endpoint.
// Replays are idempotent (see the PayPal return handler).
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
  const s = await getSiteSettings()
  if (!s?.paypalEnabled || !s?.paypalClientId || !s?.paypalSecret || !s?.paypalWebhookId) {
    throw createError({ statusCode: 400, statusMessage: 'PayPal webhook not configured' })
  }
  const paypalClientId = s.paypalClientId
  const paypalMode = s.paypalMode || 'sandbox'
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
    clientId: paypalClientId,
    secret,
    mode: paypalMode,
    webhookId,
    transmissionId: headers['paypal-transmission-id'] as string,
    transmissionTime: headers['paypal-transmission-time'] as string,
    certUrl: headers['paypal-cert-url'] as string,
    authAlgo: headers['paypal-auth-algo'] as string,
    transmissionSig: headers['paypal-transmission-sig'] as string,
    webhookEvent: body,
  }).catch(() => false)
  if (!verified) throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })

  // PAY-02: webhook-authoritative capture. When the buyer approves inside
  // PayPal but never returns to the browser, this captures + confirms without
  // the browser. Idempotent with the return-page path (confirmBookingPaid +
  // the already-paid/providerRef guards below).
  if (body?.event_type === 'CHECKOUT.ORDER.APPROVED') {
    const orderId = body?.resource?.id as string | undefined
    const customId = body?.resource?.purchase_units?.[0]?.custom_id as string | undefined
    if (orderId && customId) {
      event.waitUntil((async () => {
        try {
          const b = await prisma.booking.findUnique({ where: { id: customId } })
          if (!b || b.paymentStatus === 'PAID') return
          if (b.providerRef && b.providerRef !== orderId) return
          const cap = await paypalCaptureOrder({
            clientId: paypalClientId, secret, mode: paypalMode, orderId,
          })
          if (cap.status !== 'COMPLETED') return
          const proof = {
            amountCents: cap.amountValue ? eurToCents(cap.amountValue) : null,
            currency: cap.currency,
            paymentId: cap.captureId,
          }
          const r = await confirmBookingPaid(customId, orderId, proof)
          if (r.decision === 'confirm' && r.booking) {
            await finalizePaidBooking({
              bookingId: r.booking.id,
              depositCents: r.booking.depositCents,
              currency: settings.currency,
            })
          }
        }
        catch (e) {
          // Already captured (return page won the race) or transient — the
          // PAYMENT.CAPTURE.COMPLETED webhook / return path still confirms.
          console.warn('[paypal-webhook] approved-capture skipped:', (e as Error)?.message || e)
        }
      })())
    }
  }

  if (body?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const customId = body?.resource?.custom_id as string | undefined
    const captureId = body?.resource?.id as string | undefined
    const amountVal = body?.resource?.amount?.value as string | undefined
    const currencyCode = body?.resource?.amount?.currency_code as string | undefined
    // The capture resource carries the originating order id in
    // supplementary_data.related_ids.order_id. Booking.providerRef stores the
    // ORDER id, never the capture id; passing the capture id here would look
    // like a superseded attempt and wrongly flag a successful payment.
    const relatedOrderId = body?.resource?.supplementary_data?.related_ids?.order_id as string | undefined
    const proof = {
      amountCents: amountVal ? eurToCents(amountVal) : null,
      currency: currencyCode || null,
      paymentId: captureId || null,
    }
    if (customId) {
      const existing = await prisma.booking.findUnique({
        where: { id: customId },
        select: { providerRef: true },
      })
      // Require the order id from the signed event. Never fall back to a stored
      // reference: it could belong to a superseded order and confirm the wrong
      // payment. If PayPal omits the linkage, the return handler / APPROVED
      // webhook remains the confirmation path.
      if (!existing) {
        console.warn('[paypal-webhook] capture for unknown booking ignored')
      }
      else if (!relatedOrderId) {
        console.warn('[paypal-webhook] capture without a signed order linkage ignored')
      }
      else if (!existing.providerRef) {
        console.warn('[paypal-webhook] capture for a booking with no active order ignored')
      }
      else {
        const res = await confirmBookingPaid(customId, relatedOrderId, proof)
        if (res.decision === 'confirm' && res.booking) {
          // PAY-05: CAPI/mail/admin fan-out runs off the ACK path.
          event.waitUntil(finalizePaidBooking({
            bookingId: res.booking.id,
            depositCents: res.booking.depositCents,
            currency: settings.currency,
          }))
        }
      }
    }
  }

  // Roadmap Phase 8: refund webhooks resolve pending refund rows by the
  // PayPal refund id. Replays are no-ops (only PENDING rows flip).
  if (body?.event_type === 'PAYMENT.CAPTURE.REFUNDED' || body?.event_type === 'PAYMENT.CAPTURE.DENIED') {
    const refundId = body?.resource?.id as string | undefined
    if (refundId) {
      await prisma.bookingRefund.updateMany({
        where: { provider: 'paypal', providerRef: refundId, status: 'PENDING' },
        data: { status: body.event_type === 'PAYMENT.CAPTURE.REFUNDED' ? 'SUCCEEDED' : 'FAILED' },
      }).catch(() => null)
    }
  }
  return { received: true }
})
