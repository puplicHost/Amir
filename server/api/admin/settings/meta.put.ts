import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '../../../utils/auth'
import { encryptData } from '../../../utils/encryption'
import { metaSettingsSchema, parseBody } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  // AUDIT P3-08: validated payload; pixel id format is enforced by the schema.
  const body = await parseBody(event, metaSettingsSchema)
  const data: Record<string, unknown> = {}

  if (body.pixelId !== undefined) data.metaPixelId = body.pixelId || null
  if (body.testEventCode !== undefined) data.metaTestEventCode = body.testEventCode || null
  if (body.enabled !== undefined) data.metaEnabled = body.enabled === true
  if (body.accessToken) data.metaCapiToken = encryptData(body.accessToken)

  await upsertSiteSettings(data, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  // Any credential/config change invalidates a previous Meta verification.
  await prisma.marketingIntegration.updateMany({
    where: { platform: 'meta' },
    data: { lastVerifiedAt: null, lastError: null, lastErrorAt: null },
  }).catch(() => null)
  return { success: true }
})
