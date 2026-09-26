import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

const SOCIAL_FIELDS = [
  'socialFacebook',
  'socialInstagram',
  'socialTiktok',
  'socialYoutube',
  'socialLinkedin',
  'socialX',
] as const

function cleanUrl(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  // Basic URL validation only — no per-platform pattern matching.
  if (!/^https?:\/\/.+\..+/.test(s)) {
    throw createError({ statusCode: 400, statusMessage: 'Social links must be valid URLs starting with http(s)://' })
  }
  return s
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = await readBody(event)
  const social: Record<string, string | null | undefined> = {}
  for (const f of SOCIAL_FIELDS) social[f] = cleanUrl(body[f])
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      contactPhone1: body.contactPhone1,
      contactPhone2: body.contactPhone2,
      contactWhatsapp: body.contactWhatsapp,
      contactEmail: body.contactEmail,
      contactAddressAr: body.contactAddressAr,
      contactAddressEn: body.contactAddressEn,
      ...social,
      googleMapsEmbedUrl: body.googleMapsEmbedUrl,
    },
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
    }
  })
  return { success: true }
})
