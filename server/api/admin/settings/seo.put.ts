import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const body = await readBody(event)
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      seoMetaTitleTemplateAr: body.seoMetaTitleTemplateAr,
      seoMetaTitleTemplateEn: body.seoMetaTitleTemplateEn,
      seoMetaDescriptionAr: body.seoMetaDescriptionAr,
      seoMetaDescriptionEn: body.seoMetaDescriptionEn,
      seoKeywords: body.seoKeywords,
      geoDescription: body.geoDescription,
    },
    create: {
      siteNameAr: 'AMIR',
      siteNameEn: 'Amir',
    }
  })
  return { success: true }
})
