import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { parseBody, seoSettingsSchema } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  // AUDIT P3-08: validated payload (bounded strings, no raw body pass-through).
  const body = await parseBody(event, seoSettingsSchema)
  await upsertSiteSettings({
    seoMetaTitleTemplateAr: body.seoMetaTitleTemplateAr,
    seoMetaTitleTemplateEn: body.seoMetaTitleTemplateEn,
    seoMetaDescriptionAr: body.seoMetaDescriptionAr,
    seoMetaDescriptionEn: body.seoMetaDescriptionEn,
    seoKeywords: body.seoKeywords,
    geoDescription: body.geoDescription,
  }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
