import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

// Whitelist of non-secret settings the admin UI reads from this endpoint.
// Gateway / mail / Meta credentials are NEVER selected here — they are
// exposed only as `has*` booleans by their dedicated endpoints
// (settings/payment.get.ts, settings/mail.get.ts, settings/meta.get.ts).
const SAFE_FIELDS = {
  // General & brand
  siteNameAr: true,
  siteNameEn: true,
  taglineAr: true,
  taglineEn: true,
  logoPath: true,
  faviconPath: true,
  primaryDarkColor: true,
  primaryColor: true,
  accentColor: true,
  // SEO
  seoMetaTitleTemplateAr: true,
  seoMetaTitleTemplateEn: true,
  seoMetaDescriptionAr: true,
  seoMetaDescriptionEn: true,
  seoKeywords: true,
  geoDescription: true,
  // Store
  defaultCurrency: true,
  productsPerPage: true,
  // Contact & social
  contactPhone1: true,
  contactPhone2: true,
  contactWhatsapp: true,
  contactEmail: true,
  contactAddressAr: true,
  contactAddressEn: true,
  socialFacebook: true,
  socialInstagram: true,
  socialTiktok: true,
  socialYoutube: true,
  socialLinkedin: true,
  socialX: true,
  googleMapsEmbedUrl: true,
  // Ticker (read by admin/banners.vue)
  tickerTextAr: true,
  tickerTextEn: true,
  tickerActive: true,
  tickerSpeed: true,
} as const

export default defineEventHandler(async (event) => {
  // Settings tabs are gated on settings.business; the ticker is read by the
  // banners manager, so allow either permission (never a bare authenticated user).
  await requirePermission(event, ['settings.business', 'banners.manage'])
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    select: SAFE_FIELDS,
  })
  return settings
})
