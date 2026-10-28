import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { getSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const [slides, settings] = await Promise.all([
    prisma.heroSlide.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    getSiteSettings(),
  ])
  return { slides, intervalSec: (settings as any)?.heroSlideIntervalSec ?? 6 }
})
