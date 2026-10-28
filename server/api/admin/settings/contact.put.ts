import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { contactSettingsSchema, parseBody } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

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
  await requirePermission(event, 'settings.business')
  // AUDIT P3-08: validated payload; social URLs still checked below.
  const body = await parseBody(event, contactSettingsSchema)
  const social: Record<string, string | null | undefined> = {}
  for (const f of SOCIAL_FIELDS) social[f] = cleanUrl(body[f])
  await upsertSiteSettings({
    contactPhone1: body.contactPhone1,
    contactPhone2: body.contactPhone2,
    contactWhatsapp: body.contactWhatsapp,
    contactEmail: body.contactEmail,
    contactAddressAr: body.contactAddressAr,
    contactAddressEn: body.contactAddressEn,
    ...social,
    googleMapsEmbedUrl: body.googleMapsEmbedUrl,
  }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
