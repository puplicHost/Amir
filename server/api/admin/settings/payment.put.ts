import { requirePermission } from '../../../utils/auth'
import { encryptData } from '../../../utils/encryption'
import { parseBody, paymentSettingsSchema } from '../../../utils/validate'
import { getSiteSettings, upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.payment')
  const body = await parseBody(event, paymentSettingsSchema)
  const data: Record<string, unknown> = {}

  // Enabling PayPal without usable credentials would silently block online
  // booking. Consider the incoming values plus any already-stored secret.
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
