import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  await upsertSiteSettings({ logoPath: null }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
