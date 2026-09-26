import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { encryptData } from '../../../utils/encryption'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = (await readBody(event)) || {}
  const data: Record<string, unknown> = {}

  if ('pixelId' in body) {
    const v = typeof body.pixelId === 'string' ? body.pixelId.trim() : ''
    // Meta Pixel (dataset) IDs are numeric.
    if (v && !/^\d+$/.test(v)) {
      throw createError({ statusCode: 400, statusMessage: 'Pixel ID must be numeric' })
    }
    data.metaPixelId = v || null
  }
  if ('testEventCode' in body) {
    const v = typeof body.testEventCode === 'string' ? body.testEventCode.trim() : ''
    data.metaTestEventCode = v || null
  }
  if ('enabled' in body) data.metaEnabled = body.enabled === true
  if (typeof body.accessToken === 'string' && body.accessToken) {
    data.metaCapiToken = encryptData(body.accessToken)
  }

  const existing = await prisma.siteSettings.findFirst()
  await prisma.siteSettings.upsert({
    where: { id: existing?.id || 1 },
    update: data,
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
      ...data,
    },
  })
  return { success: true }
})
