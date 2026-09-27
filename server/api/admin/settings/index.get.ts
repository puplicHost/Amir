import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.view')
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  // Remove credentials before sending to client (mirror payment pattern:
  // never return raw secrets, only boolean "configured" flags)
  if (settings) {
    const hasMetaCapiToken = !!settings.metaCapiToken
    settings.paymentGatewayCredentials = null as any
    settings.metaCapiToken = null as any
    return { ...settings, hasMetaCapiToken }
  }
  return settings
})
