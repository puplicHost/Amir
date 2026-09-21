import { decryptData } from '../../../utils/encryption'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.view')
  const settings = await prisma.siteSettings.findFirst()
  if (!settings) throw createError({ statusCode: 404, statusMessage: 'Settings not found' })

  // Only check if credentials exist, never return them raw.
  const hasCredentials = !!settings.paymentGatewayCredentials
  // Optional: try to decrypt to ensure it's valid, but don't return.
  if (hasCredentials) {
    try {
      decryptData(settings.paymentGatewayCredentials!)
    }
    catch {
      // Data is malformed or key changed
    }
  }

  return {
    payment: {
      codEnabled: settings.paymentCodEnabled,
      onlineEnabled: settings.paymentOnlineEnabled,
      gatewayName: settings.paymentGatewayName || '',
      gatewayMode: settings.paymentGatewayMode || 'sandbox',
      hasCredentials,
    },
  }
})
