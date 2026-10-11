import { requirePermission } from '../../../utils/auth'

// Payment gateway config. Secrets are never returned raw —
// only hasCredentials booleans.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.payment')
  const settings = await prisma.siteSettings.findFirst()
  return {
    payment: {
      stripeEnabled: settings?.stripeEnabled ?? false,
      stripePublishableKey: settings?.stripePublishableKey || '',
      hasStripeSecret: !!settings?.stripeSecretKey,
      hasStripeWebhookSecret: !!settings?.stripeWebhookSecret,
      paypalEnabled: settings?.paypalEnabled ?? false,
      paypalClientId: settings?.paypalClientId || '',
      hasPaypalSecret: !!settings?.paypalSecret,
      hasPaypalWebhookId: !!settings?.paypalWebhookId,
      paypalMode: settings?.paypalMode || 'sandbox',
    },
  }
})
