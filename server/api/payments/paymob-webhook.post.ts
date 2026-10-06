import { createHmac } from 'node:crypto'
import { confirmOnlineOrder, getGatewayConfig } from '../../utils/payments'

// Paymob "Transaction Processed" callback. Verifies HMAC-SHA512 over the
// documented field order using the merchant secret key from SiteSettings.
const HMAC_KEYS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
  'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
  'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
]

function pickPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc: any, k: string) => (acc == null ? acc : acc[k]), obj)
}

function hmacValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v ?? '')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const obj = body?.obj || body?.transaction || body
  const receivedHmac = String(body?.hmac || getQuery(event).hmac || '')

  const cfg = await getGatewayConfig()
  if (cfg?.name !== 'paymob' || !receivedHmac) {
    throw createError({ statusCode: 400, statusMessage: 'Webhook not configured' })
  }
  const secret = cfg.creds.secretKey || cfg.creds.secret_key || cfg.creds.hmac || ''
  if (!secret) throw createError({ statusCode: 400, statusMessage: 'Webhook not configured' })

  const concatenated = HMAC_KEYS.map(k => hmacValue(pickPath(obj, k))).join('')
  const expected = createHmac('sha512', secret).update(concatenated).digest('hex')
  if (expected !== receivedHmac.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid signature' })
  }

  if (obj?.success !== true) return { ok: true, confirmed: false }

  const orderNumber = String(obj?.order?.merchant_order_id || '')
  if (!orderNumber) throw createError({ statusCode: 400, statusMessage: 'Missing order reference' })

  const ok = await confirmOnlineOrder(orderNumber, `paymob:${String(obj?.id || '')}`)
  return { ok, confirmed: ok }
})
