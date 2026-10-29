import { requirePermission } from '../../../utils/auth'
import { getSiteSettings } from '../../../utils/site-settings'

// Payment gateway config. Secrets are never returned raw —
// only hasCredentials booleans. Server env credentials are reported as
// configured without exposing their values.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.payment')
  const settings = await getSiteSettings()
  return {
    payment: {
      stripeEnabled: settings?.stripeEnabled ?? false,
      stripePublishableKey: settings?.stripePublishableKey || '',
      hasStripeSecret: !!settings?.stripeSecretKey || !!process.env.STRIPE_SECRET_KEY,
      stripeEnvConfigured: !!process.env.STRIPE_SECRET_KEY,
      hasStripeWebhookSecret: !!settings?.stripeWebhookSecret || !!process.env.STRIPE_WEBHOOK_SECRET,
      paypalEnabled: settings?.paypalEnabled ?? false,
      paypalClientId: settings?.paypalClientId || '',
      hasPaypalSecret: !!settings?.paypalSecret,
      hasPaypalWebhookId: !!settings?.paypalWebhookId,
      paypalMode: settings?.paypalMode || 'sandbox',
    },
  }
})
