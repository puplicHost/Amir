import { requirePermission } from '../../../utils/auth'
import { getSiteSettings } from '../../../utils/site-settings'

// Payment gateway config. Secrets are never returned raw —
// only hasCredentials booleans.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.payment')
  const settings = await getSiteSettings()
  return {
    payment: {
      paypalEnabled: settings?.paypalEnabled ?? false,
      paypalClientId: settings?.paypalClientId || '',
      hasPaypalSecret: !!settings?.paypalSecret,
      hasPaypalWebhookId: !!settings?.paypalWebhookId,
      paypalMode: settings?.paypalMode || 'sandbox',
    },
  }
})
