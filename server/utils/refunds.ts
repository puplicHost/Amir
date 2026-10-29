// Real deposit refunds via Stripe or PayPal (Roadmap Phase 8).
// Every attempt carries an idempotency key so retries and webhook replays
// never double-refund. Amounts never exceed deposit minus already-refunded.

import { getPaypalConfig, getStripeConfig } from './booking-payments.ts'
import { paypalAccessToken, paypalBase } from './paypal.ts'

export interface RefundAttempt {
  ok: boolean
  providerRef: string | null
  error: string | null
}

/**
 * Refund `amountCents` of a paid deposit back to the original method.
 * Stripe: refunds.create on the PaymentIntent. PayPal: refund on the capture.
 * Manual/cash or rows without a provider reference cannot be refunded
 * automatically and must be handled outside the system.
 */
export async function refundDeposit(input: {
  paymentProvider: string
  providerPaymentId: string | null
  amountCents: number
  currency: string
  idempotencyKey: string
}): Promise<RefundAttempt> {
  if (input.amountCents <= 0) {
    return { ok: false, providerRef: null, error: 'Nothing to refund' }
  }
  try {
    if (input.paymentProvider === 'stripe') {
      if (!input.providerPaymentId) {
        return { ok: false, providerRef: null, error: 'Missing Stripe payment reference' }
      }
      const stripe = await getStripeConfig()
      const refund = await stripe.client.refunds.create(
        {
          payment_intent: input.providerPaymentId,
          amount: input.amountCents,
        },
        { idempotencyKey: input.idempotencyKey },
      )
      if (refund.status === 'failed') {
        return { ok: false, providerRef: refund.id, error: refund.failure_reason || 'Stripe refund failed' }
      }
      return { ok: true, providerRef: refund.id, error: null }
    }
    if (input.paymentProvider === 'paypal') {
      if (!input.providerPaymentId) {
        return { ok: false, providerRef: null, error: 'Missing PayPal capture reference' }
      }
      const paypal = await getPaypalConfig()
      const token = await paypalAccessToken(paypal.clientId, paypal.secret, paypal.mode)
      const res = await fetch(
        `${paypalBase(paypal.mode)}/v2/payments/captures/${encodeURIComponent(input.providerPaymentId)}/refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'PayPal-Request-Id': input.idempotencyKey,
          },
          body: JSON.stringify({
            amount: {
              value: (input.amountCents / 100).toFixed(2),
              currency_code: input.currency,
            },
          }),
        },
      )
      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) {
        const msg = data?.details?.[0]?.issue || data?.message || `PayPal refund failed (${res.status})`
        return { ok: false, providerRef: data?.id || null, error: String(msg) }
      }
      return { ok: true, providerRef: (data?.id as string) || null, error: null }
    }
    return { ok: false, providerRef: null, error: `No automatic refund for provider ${input.paymentProvider || 'unknown'}` }
  }
  catch (e: any) {
    return { ok: false, providerRef: null, error: String((e as Error)?.message || e).slice(0, 300) }
  }
}
