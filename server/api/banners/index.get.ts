import { prisma } from '../../utils/prisma'
import { getSiteSettings } from '../../utils/site-settings'

// Public feed: active homepage banners (sorted) + announcement ticker.
export default defineEventHandler(async () => {
  const [banners, settings] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    getSiteSettings(),
  ])
  return {
    banners,
    ticker: {
      textAr: settings?.tickerTextAr || null,
      textEn: settings?.tickerTextEn || null,
      active: settings?.tickerActive ?? false,
      speed: settings?.tickerSpeed ?? 30,
    },
  }
})
