import { requirePermission } from '../../../../utils/auth'
import { upsertSiteSettings } from '../../../../utils/site-settings'
import { logAudit } from '../../../../utils/audit'
import { parseBody, heroIntervalSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'settings.business')
  const body = await parseBody(event, heroIntervalSchema)

  await upsertSiteSettings({ heroSlideIntervalSec: body.intervalSec }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  await logAudit({
    entityType: 'hero-slide',
    entityId: 'site-settings',
    entityName: 'Hero slideshow',
    action: 'updated',
    details: `Hero slide interval set to ${body.intervalSec}s`,
    user: actor,
  })
  return { success: true, intervalSec: body.intervalSec }
})
