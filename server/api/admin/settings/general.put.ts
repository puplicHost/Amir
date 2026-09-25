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
