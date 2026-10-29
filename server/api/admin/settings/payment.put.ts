import { requirePermission } from '../../../utils/auth'
import { encryptData } from '../../../utils/encryption'
import { parseBody, paymentSettingsSchema } from '../../../utils/validate'
import { getSiteSettings, upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.payment')
  const body = await parseBody(event, paymentSettingsSchema)
  const data: Record<string, unknown> = {}

  // Enabling a gateway without usable credentials would silently block online
  // booking. Consider incoming values, stored secrets, and server env vars.
  if (body.stripeEnabled === true) {
    const current = await getSiteSettings()
    const incomingSecret = typeof body.stripeSecretKey === 'string' ? body.stripeSecretKey.trim() : ''
    const hasSecret = Boolean(incomingSecret || current?.stripeSecretKey || process.env.STRIPE_SECRET_KEY)
    if (!hasSecret) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Stripe cannot be enabled without a Secret key.',
      })
    }
    if (incomingSecret.includes('_live_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Stripe live keys are disabled; use Sandbox (test) credentials.',
      })
    }
  }
  if (body.paypalEnabled === true) {
    const current = await getSiteSettings()
    const clientId = body.paypalClientId !== undefined ? body.paypalClientId : current?.paypalClientId
    const hasSecret = (typeof body.paypalSecret === 'string' && !!body.paypalSecret.trim())
      || Boolean(current?.paypalSecret)
    if (!clientId?.trim() || !hasSecret) {
      throw createError({
        statusCode: 400,
        statusMessage: 'PayPal cannot be enabled without a Client ID and Secret.',
      })
    }
  }

  if (body.stripeEnabled !== undefined) data.stripeEnabled = body.stripeEnabled
  if (body.stripePublishableKey !== undefined) {
    data.stripePublishableKey = body.stripePublishableKey?.trim() ? body.stripePublishableKey.trim() : null
  }
  // Blank secret fields keep the existing stored value; never erase implicitly.
  if (typeof body.stripeSecretKey === 'string' && body.stripeSecretKey.trim()) {
    data.stripeSecretKey = encryptData(body.stripeSecretKey.trim())
  }
  if (typeof body.stripeWebhookSecret === 'string' && body.stripeWebhookSecret.trim()) {
    data.stripeWebhookSecret = encryptData(body.stripeWebhookSecret.trim())
  }

  if (body.paypalEnabled !== undefined) data.paypalEnabled = body.paypalEnabled
  if (body.paypalClientId !== undefined) {
    data.paypalClientId = body.paypalClientId?.trim() ? body.paypalClientId.trim() : null
  }
  if (typeof body.paypalSecret === 'string' && body.paypalSecret.trim()) {
    data.paypalSecret = encryptData(body.paypalSecret.trim())
  }
  if (typeof body.paypalWebhookId === 'string' && body.paypalWebhookId.trim()) {
    data.paypalWebhookId = encryptData(body.paypalWebhookId.trim())
  }
  if (body.paypalMode !== undefined) data.paypalMode = body.paypalMode

  await upsertSiteSettings(data, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
