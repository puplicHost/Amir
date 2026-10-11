import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  // Remove credentials before sending to client (never return raw secrets,
  // only boolean "configured" flags)
  if (settings) {
    const hasMetaCapiToken = !!settings.metaCapiToken
    settings.metaCapiToken = null as any
    return { ...settings, hasMetaCapiToken }
  }
  return settings
})
