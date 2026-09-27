import { defineCachedEventHandler } from 'nitropack/runtime'
import { prisma } from '../../utils/prisma'

// Public site-wide SEO/GEO fallback data. Only non-sensitive fields —
// never credentials. Pages with their own specific SEO use that first and
// fall back to these templates/descriptions when page-specific data is missing.
export default defineCachedEventHandler(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  return {
    titleTemplateAr: settings?.seoMetaTitleTemplateAr || null,
    titleTemplateEn: settings?.seoMetaTitleTemplateEn || null,
    descriptionAr: settings?.seoMetaDescriptionAr || null,
    descriptionEn: settings?.seoMetaDescriptionEn || null,
    keywords: settings?.seoKeywords || null,
    geoDescription: settings?.geoDescription || null,
  }
}, { maxAge: 60 })
