import { createError, defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

// Required bilingual fields must never be silently blanked: Prisma skips
// `undefined` but persists `''`, so reject explicit empty strings here.
const REQUIRED_FIELDS = ['siteNameAr', 'siteNameEn'] as const

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = (await readBody(event)) || {}
  for (const field of REQUIRED_FIELDS) {
    if (field in body && typeof body[field] === 'string' && !body[field].trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid settings', message: `${field} is required and cannot be empty.` })
    }
  }
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  const colorUpdate: Record<string, string> = {}
  for (const [key, fallback] of [['primaryDarkColor', '#285E8E'], ['primaryColor', '#2B71AE'], ['accentColor', '#F5CC07']] as const) {
    if (body[key] === undefined) continue
    const val = String(body[key]).trim()
    if (!HEX_RE.test(val)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid settings', message: `${key} must be a hex color like ${fallback}.` })
    }
    colorUpdate[key] = val
  }
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
      ...colorUpdate,
    },
    create: {
      siteNameAr: body.siteNameAr || 'مانجو إلكترونيكس',
      siteNameEn: body.siteNameEn || 'Mango Electronics',
    }
  })
  return { success: true }
})
