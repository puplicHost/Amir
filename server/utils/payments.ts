import { createHmac } from 'node:crypto'
import { decryptData } from './encryption'

// Payment gateway integration (Paymob / Fawry).
// Credentials live ONLY in the encrypted SiteSettings.paymentGatewayCredentials
// column — never in .env. Every failure returns null so checkout silently
// falls back to COD.

export interface GatewayConfig {
  name: 'paymob' | 'fawry'
  mode: string
  creds: Record<string, string>
}

export async function getGatewayConfig(): Promise<GatewayConfig | null> {
  try {
    const settings = await prisma.siteSettings.findFirst()
    if (!settings?.paymentOnlineEnabled) return null
    const rawName = String(settings.paymentGatewayName || '').trim().toLowerCase()
    const name = rawName.includes('fawry') ? 'fawry' : rawName.includes('pay') ? 'paymob' : null
    if (!name || !settings.paymentGatewayCredentials) return null
    const creds = JSON.parse(decryptData(settings.paymentGatewayCredentials)) as Record<string, unknown>
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(creds)) {
      if (v !== null && v !== undefined) flat[k] = String(v)
    }
    return { name, mode: String(settings.paymentGatewayMode || 'sandbox'), creds: flat }
  }
  catch {
    return null
  }
}

interface ChargeOrder {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  totalAmount: unknown
}

function pick(creds: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (creds[k]) return creds[k]
  }
  return ''
}

async function postJson(url: string, body: unknown, headers?: Record<string, string>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`gateway http ${res.status}`)
  return res.json()
}

// ── Paymob (Accept Intention / iframe flow) ──────────────────────
export async function createPaymobPaymentUrl(order: ChargeOrder, creds: Record<string, string>): Promise<string | null> {
  try {
    const apiKey = pick(creds, 'apiKey', 'api_key')
    const integrationId = pick(creds, 'integrationId', 'integration_id')
    const iframeId = pick(creds, 'iframeId', 'iframe_id')
    if (!apiKey || !integrationId || !iframeId) return null

    const amountCents = Math.round(Number(order.totalAmount) * 100)
    const { token } = await postJson('https://accept.paymob.com/api/auth/tokens', { api_key: apiKey })
    const created = await postJson('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: order.orderNumber,
      items: [{ name: `Order ${order.orderNumber}`, amount_cents: amountCents, description: `Mango Electronics ${order.orderNumber}`, quantity: 1 }],
    })
    const names = String(order.customerName).split(' ')
    const { token: paymentToken } = await postJson('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: created.id,
      billing_data: {
        first_name: names[0] || 'Customer',
        last_name: names.slice(1).join(' ') || 'Customer',
        email: order.customerEmail || 'customer@mango-electronics.com',
        phone_number: order.customerPhone,
        apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA',
        shipping_method: 'NA', postal_code: 'NA', city: 'NA',
        country: 'EG', state: 'NA',
      },
      currency: 'EGP',
      integration_id: Number(integrationId),
    })
    return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`
  }
  catch {
    return null
  }
}

// ── Fawry (hosted card charge) ───────────────────────────────────
export async function createFawryPaymentUrl(order: ChargeOrder, creds: Record<string, string>): Promise<string | null> {
  try {
    const merchantCode = pick(creds, 'merchantCode', 'merchant_code', 'apiKey')
    const secureKey = pick(creds, 'secureKey', 'secure_key', 'secretKey', 'secret_key')
    if (!merchantCode || !secureKey) return null

    const amount = Number(order.totalAmount).toFixed(2)
    const signature = createHmac('sha256', secureKey)
      .update(`${merchantCode}${order.orderNumber}${amount}${secureKey}`)
      .digest('hex')
    const res = await postJson('https://www.atfawry.com/ECommerceWebService/Charge', {
      merchantCode,
      merchantRefNum: order.orderNumber,
      customerName: order.customerName,
      customerMobile: order.customerPhone,
      customerEmail: order.customerEmail || '',
      paymentMethod: 'CARD',
      amount,
      currencyCode: 'EGP',
      language: 'en-gb',
      chargeItems: [{ itemId: order.id, description: `Order ${order.orderNumber}`, price: amount, quantity: 1 }],
      signature,
    })
    const url = res?.paymentUrl || res?.nextUrl || res?.redirectUrl
    return typeof url === 'string' && url.startsWith('http') ? url : null
  }
  catch {
    return null
  }
}

export async function createOnlinePaymentUrl(order: ChargeOrder): Promise<string | null> {
  const cfg = await getGatewayConfig()
  if (!cfg) return null
  if (cfg.name === 'paymob') return createPaymobPaymentUrl(order, cfg.creds)
  return createFawryPaymentUrl(order, cfg.creds)
}

// ── Shared post-payment bookkeeping ─────────────────────────────
export async function confirmOnlineOrder(orderNumber: string, gatewayRef: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { orderNumber } })
  if (!order || order.status === 'confirmed') return !!order
  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } }),
    prisma.orderStatusHistory.create({
      data: { orderId: order.id, status: 'confirmed', changedByUserId: null },
    }),
  ])
  await notifyAdmins({
    type: 'payment_confirmed',
    relatedEntityId: order.id,
    url: `/admin/orders/${order.id}`,
    titleEn: `Payment confirmed ${orderNumber}`,
    titleAr: `تم تأكيد الدفع ${orderNumber}`,
    bodyEn: `${gatewayRef}`,
    bodyAr: `${gatewayRef}`,
  }).catch(() => {})
  return true
}
