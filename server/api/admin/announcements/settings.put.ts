import { requirePermission } from '../../../utils/auth'
import { announcementSettingsSchema, parseBody } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  // AUDIT P3-08: validated payload instead of raw readBody.
  const body = await parseBody(event, announcementSettingsSchema)

  const settings = await upsertSiteSettings({
    announcementActive: body.announcementActive,
    announcementBgColor: body.announcementBgColor || undefined,
  }, {
    siteNameAr: 'AMIR',
    siteNameEn: 'Amir',
    announcementActive: body.announcementActive ?? true,
    announcementBgColor: body.announcementBgColor || '#050808',
  })

  return { success: true, settings }
})
