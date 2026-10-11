import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const body = await readBody(event)

  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      announcementActive: body.announcementActive !== undefined ? Boolean(body.announcementActive) : undefined,
      announcementBgColor: body.announcementBgColor ? String(body.announcementBgColor).trim() : undefined,
    },
    create: {
      siteNameAr: 'AMIR',
      siteNameEn: 'Amir',
      announcementActive: body.announcementActive !== undefined ? Boolean(body.announcementActive) : true,
      announcementBgColor: body.announcementBgColor || '#050808',
    },
  })

  return { success: true, settings }
})
