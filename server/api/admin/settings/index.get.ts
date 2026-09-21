import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.view')
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  // Remove credentials before sending to client
  if (settings) {
    settings.paymentGatewayCredentials = null as any
  }
  return settings
})
