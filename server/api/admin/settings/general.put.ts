import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = await readBody(event)
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      siteNameAr: body.siteNameAr,
      siteNameEn: body.siteNameEn,
      taglineAr: body.taglineAr,
      taglineEn: body.taglineEn,
      bannerTextAr: body.bannerTextAr,
      bannerTextEn: body.bannerTextEn,
      bannerButtonTextAr: body.bannerButtonTextAr,
      bannerButtonTextEn: body.bannerButtonTextEn,
      bannerButtonUrl: body.bannerButtonUrl,
    },
    create: {
      siteNameAr: body.siteNameAr || 'مانجو إلكترونيكس',
      siteNameEn: body.siteNameEn || 'Mango Electronics',
    }
  })
  return { success: true }
})
