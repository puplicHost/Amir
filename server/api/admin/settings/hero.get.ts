import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const [slides, settings] = await Promise.all([
    prisma.heroSlide.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: { heroSlideIntervalSec: true } }),
  ])
  return { slides, intervalSec: settings?.heroSlideIntervalSec ?? 6 }
})
