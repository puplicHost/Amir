import { getSiteSettings } from '../../utils/site-settings'

export default defineEventHandler(async () => {
  const [items, settings] = await Promise.all([
    prisma.announcementItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    getSiteSettings(),
  ])

  return {
    items,
    active: settings?.announcementActive ?? true,
    bgColor: settings?.announcementBgColor || '#2B71AE',
  }
})
