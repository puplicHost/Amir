import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { parseBody, tickerSettingsSchema } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  // AUDIT P3-08: validated payload; speed bounds enforced by the schema.
  const body = await parseBody(event, tickerSettingsSchema)
  await upsertSiteSettings({
    tickerTextAr: body.tickerTextAr || null,
    tickerTextEn: body.tickerTextEn || null,
    tickerActive: body.tickerActive === true,
    tickerSpeed: body.tickerSpeed ?? 30,
  }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
