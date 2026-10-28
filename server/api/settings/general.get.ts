import { defineCachedEventHandler } from 'nitropack/runtime'
import { prisma } from '../../utils/prisma'
import { getSiteSettings } from '../../utils/site-settings'
import { heroVariant1200 } from '../../utils/storage'

export default defineCachedEventHandler(async () => {
  const [settings, slides] = await Promise.all([
    getSiteSettings(),
    prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { imagePath: true, altText: true },
    }),
  ])
  if (!settings) return null
  return {
    siteNameAr: settings.siteNameAr,
    siteNameEn: settings.siteNameEn,
    taglineAr: settings.taglineAr,
    taglineEn: settings.taglineEn,
    logoPath: settings.logoPath,
    faviconPath: settings.faviconPath,
    heroImagePath: settings.heroImagePath,
    heroSlideIntervalSec: (settings as any).heroSlideIntervalSec ?? 6,
    heroSlides: slides.map(s => ({
      url: s.imagePath,
      url1200: heroVariant1200(s.imagePath),
      alt: s.altText,
    })),
    primaryDarkColor: (settings as any).primaryDarkColor || '#285E8E',
    primaryColor: (settings as any).primaryColor || '#2B71AE',
    accentColor: (settings as any).accentColor || '#F5CC07',
    offerEndDate: (settings as any).offerEndDate || null,
    announcementActive: (settings as any).announcementActive ?? true,
    announcementBgColor: (settings as any).announcementBgColor || '#2B71AE',
    bannerTextAr: settings.bannerTextAr,
    bannerTextEn: settings.bannerTextEn,
    bannerButtonTextAr: settings.bannerButtonTextAr,
    bannerButtonTextEn: settings.bannerButtonTextEn,
    bannerButtonUrl: settings.bannerButtonUrl,
  }
}, { maxAge: 60 })
