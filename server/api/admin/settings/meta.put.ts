import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { encryptData } from '../../../utils/encryption'
import { metaSettingsSchema, parseBody } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.meta')
  // AUDIT P3-08: validated payload; pixel id format is enforced by the schema.
  const body = await parseBody(event, metaSettingsSchema)
  const data: Record<string, unknown> = {}

  if (body.pixelId !== undefined) data.metaPixelId = body.pixelId || null
  if (body.testEventCode !== undefined) data.metaTestEventCode = body.testEventCode || null
  if (body.enabled !== undefined) data.metaEnabled = body.enabled === true
  if (body.accessToken) data.metaCapiToken = encryptData(body.accessToken)

  await upsertSiteSettings(data, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
