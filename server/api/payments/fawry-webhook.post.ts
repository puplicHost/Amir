import { createHash } from 'node:crypto'
import { confirmOnlineOrder, getGatewayConfig } from '../../utils/payments'

// Fawry payment-status notification. Verifies messageSignature =
// SHA256(fawryRefNumber + merchantRefNumber + paymentAmount + orderAmount +
// orderStatus + secureKey) with the secure key from SiteSettings.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const fawryRefNumber = String(body?.fawryRefNumber || '')
  const merchantRefNumber = String(body?.merchantRefNumber || '')
  const paymentAmount = String(body?.paymentAmount || '')
  const orderAmount = String(body?.orderAmount || '')
  const orderStatus = String(body?.orderStatus || '')
  const received = String(body?.messageSignature || body?.signature || '')

  const cfg = await getGatewayConfig()
  if (cfg?.name !== 'fawry' || !received || !merchantRefNumber) {
    throw createError({ statusCode: 400, statusMessage: 'Webhook not configured' })
  }
  const secureKey = cfg.creds.secureKey || cfg.creds.secure_key || cfg.creds.secretKey || ''
  if (!secureKey) throw createError({ statusCode: 400, statusMessage: 'Webhook not configured' })

  const expected = createHash('sha256')
    .update(`${fawryRefNumber}${merchantRefNumber}${paymentAmount}${orderAmount}${orderStatus}${secureKey}`)
    .digest('hex')
  if (expected !== received.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid signature' })
  }

  if (!['paid', 'paidconfirmed', 'settled'].includes(orderStatus.toLowerCase())) {
    return { ok: true, confirmed: false }
  }

  const ok = await confirmOnlineOrder(merchantRefNumber, `fawry:${fawryRefNumber}`)
  return { ok, confirmed: ok }
})
