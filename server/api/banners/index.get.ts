import { prisma } from '../../utils/prisma'

// Public feed: active homepage banners (sorted) + announcement ticker.
export default defineEventHandler(async () => {
  const [banners, settings] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
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
