import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = await readBody(event)

  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      announcementActive: body.announcementActive !== undefined ? Boolean(body.announcementActive) : undefined,
      announcementBgColor: body.announcementBgColor ? String(body.announcementBgColor).trim() : undefined,
    },
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
      announcementActive: body.announcementActive !== undefined ? Boolean(body.announcementActive) : true,
      announcementBgColor: body.announcementBgColor || '#2B71AE',
    },
  })

  return { success: true, settings }
})
