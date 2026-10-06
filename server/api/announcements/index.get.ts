export default defineEventHandler(async () => {
  const [items, settings] = await Promise.all([
    prisma.announcementItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSettings.findUnique({
      where: { id: 1 },
      select: { announcementActive: true, announcementBgColor: true },
    }),
  ])

  return {
    items,
    active: settings?.announcementActive ?? true,
    bgColor: settings?.announcementBgColor || '#2B71AE',
  }
})
