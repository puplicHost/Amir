import { encryptData } from '../../../utils/encryption'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = await readBody(event)
  
  const existing = await prisma.siteSettings.findFirst()
  const id = existing?.id || 1

  const data: Record<string, unknown> = {}
  if (typeof body.codEnabled === 'boolean') data.paymentCodEnabled = body.codEnabled
  if (typeof body.onlineEnabled === 'boolean') data.paymentOnlineEnabled = body.onlineEnabled
  if (typeof body.gatewayName === 'string') data.paymentGatewayName = body.gatewayName.trim()
  if (typeof body.gatewayMode === 'string') {
    data.paymentGatewayMode = ['sandbox', 'production'].includes(body.gatewayMode) ? body.gatewayMode : 'sandbox'
  }
  
  if (body.credentials && typeof body.credentials === 'object') {
    // We expect { apiKey: string, secretKey: string } or similar
    const credString = JSON.stringify(body.credentials)
    data.paymentGatewayCredentials = encryptData(credString)
  }

  await prisma.siteSettings.upsert({
    where: { id },
    update: data,
    create: {
      taglineAr: '...',
      taglineEn: '...',
      ...data,
    },
  })

  return { ok: true }
})
