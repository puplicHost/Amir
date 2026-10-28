import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { parseBody, storeSettingsSchema } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  // AUDIT P3-08: validated payload; ISO currency + page size bounds enforced.
  const body = await parseBody(event, storeSettingsSchema)
  await upsertSiteSettings({
    defaultCurrency: body.defaultCurrency,
    productsPerPage: body.productsPerPage ?? 16,
  }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
