// PayPal REST API via fetch — no SDK (Phase 2c).
// All calls are server-to-server. Amounts always come from server snapshots.

export function paypalBase(mode: string): string {
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

export function eurValue(cents: number): string {
  return (cents / 100).toFixed(2)
}

async function paypalFetch(
  mode: string, accessToken: string | null, path: string, init?: RequestInit,
): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const res = await fetch(`${paypalBase(mode)}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> || {}) } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.message || body?.error_description || `PayPal request failed (${res.status})`
    throw createError({ statusCode: 502, statusMessage: `PayPal: ${msg}` })
  }
  return body
}

/** OAuth2 client-credentials access token (cached per call; short-lived use). */
export async function paypalAccessToken(clientId: string, secret: string, mode: string): Promise<string> {
  const res = await fetch(`${paypalBase(mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body?.access_token) {
    throw createError({ statusCode: 502, statusMessage: 'PayPal: authentication failed' })
  }
  return body.access_token as string
}

export interface PaypalOrder {
  id: string
  approveUrl: string | null
}

/** Create a CAPTURE order for the deposit amount. */
export async function paypalCreateOrder(input: {
  clientId: string
  secret: string
  mode: string
  depositCents: number
  currency: string
  customId: string
  returnUrl: string
  cancelUrl: string
  brandName: string
}): Promise<PaypalOrder> {
  const token = await paypalAccessToken(input.clientId, input.secret, input.mode)
  const order = await paypalFetch(input.mode, token, '/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: input.customId,
          amount: { currency_code: input.currency, value: eurValue(input.depositCents) },
        },
      ],
      application_context: {
        brand_name: input.brandName,
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        user_action: 'PAY_NOW',
      },
    }),
  })
  const approveUrl = (order?.links || []).find((l: any) => l?.rel === 'approve')?.href || null
  if (!order?.id || !approveUrl) {
    throw createError({ statusCode: 502, statusMessage: 'PayPal: order creation failed' })
  }
  return { id: order.id as string, approveUrl }
}

export interface PaypalCapture {
  status: string
  captureId: string | null
  amountValue: string | null
  currency: string | null
}

/** Server-side capture. Only COMPLETED counts as paid. */
export async function paypalCaptureOrder(input: {
  clientId: string
  secret: string
  mode: string
  orderId: string
}): Promise<PaypalCapture> {
  const token = await paypalAccessToken(input.clientId, input.secret, input.mode)
  const data = await paypalFetch(input.mode, token, `/v2/checkout/orders/${input.orderId}/capture`, {
    method: 'POST',
    body: '{}',
  })
  const units = data?.purchase_units || []
  const capture = units.flatMap((u: any) => u?.payments?.captures || [])[0]
  return {
    status: data?.status || capture?.status || 'UNKNOWN',
    captureId: capture?.id || null,
    amountValue: capture?.amount?.value || null,
    currency: capture?.amount?.currency_code || null,
  }
}

/** Verify a webhook signature through PayPal's endpoint. */
export async function paypalVerifyWebhook(input: {
  clientId: string
  secret: string
  mode: string
  webhookId: string
  transmissionId: string
  transmissionTime: string
  certUrl: string
  authAlgo: string
  transmissionSig: string
  webhookEvent: unknown
}): Promise<boolean> {
  const token = await paypalAccessToken(input.clientId, input.secret, input.mode)
  const data = await paypalFetch(input.mode, token, '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      transmission_id: input.transmissionId,
      transmission_time: input.transmissionTime,
      cert_url: input.certUrl,
      auth_algo: input.authAlgo,
      transmission_sig: input.transmissionSig,
      webhook_id: input.webhookId,
      webhook_event: input.webhookEvent,
    }),
  })
  return data?.verification_status === 'SUCCESS'
}
