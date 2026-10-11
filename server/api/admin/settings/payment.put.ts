import { requirePermission } from '../../../utils/auth'
import { encryptData } from '../../../utils/encryption'
import { parseBody, paymentSettingsSchema } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.payment')
  const body = await parseBody(event, paymentSettingsSchema)
  const data: Record<string, unknown> = {}

  if (body.stripeEnabled !== undefined) data.stripeEnabled = body.stripeEnabled
  if (body.stripePublishableKey !== undefined) {
    data.stripePublishableKey = body.stripePublishableKey?.trim() ? body.stripePublishableKey.trim() : null
  }
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

  const existing = await prisma.siteSettings.findFirst()
  await prisma.siteSettings.upsert({
    where: { id: existing?.id || 1 },
    update: data,
    create: {
      siteNameAr: 'AMIR',
      siteNameEn: 'Amir',
      ...data,
    },
  })
  return { success: true }
})
