import { createError, defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { generalSettingsSchema, parseBody } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

// Required bilingual fields must never be silently blanked: Prisma skips
// `undefined` but persists `''`, so reject explicit empty strings here.
const REQUIRED_FIELDS = ['siteNameAr', 'siteNameEn'] as const

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  // AUDIT P3-08: validated payload with bounded fields and color checks.
  const body = await parseBody(event, generalSettingsSchema)
  for (const field of REQUIRED_FIELDS) {
    if (field in body && typeof body[field] === 'string' && !body[field].trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid settings', message: `${field} is required and cannot be empty.` })
    }
  }
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  const colorUpdate: Record<string, string> = {}
  for (const [key, fallback] of [['primaryDarkColor', '#285E8E'], ['primaryColor', '#2B71AE'], ['accentColor', '#F5CC07']] as const) {
    const val = body[key]
    if (val === undefined) continue
    if (!HEX_RE.test(val)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid settings', message: `${key} must be a hex color like ${fallback}.` })
    }
    colorUpdate[key] = val
  }
  await upsertSiteSettings({
    siteNameAr: body.siteNameAr,
    siteNameEn: body.siteNameEn,
    taglineAr: body.taglineAr,
    taglineEn: body.taglineEn,
    bannerTextAr: body.bannerTextAr,
    bannerTextEn: body.bannerTextEn,
    bannerButtonTextAr: body.bannerButtonTextAr,
    bannerButtonTextEn: body.bannerButtonTextEn,
    bannerButtonUrl: body.bannerButtonUrl,
    offerEndDate: body.offerEndDate ? new Date(body.offerEndDate) : null,
    announcementActive: body.announcementActive !== undefined ? Boolean(body.announcementActive) : undefined,
    announcementBgColor: body.announcementBgColor,
    ...colorUpdate,
  }, {
    siteNameAr: body.siteNameAr || 'AMIR',
    siteNameEn: body.siteNameEn || 'Amir',
  })
  return { success: true }
})
