import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { getSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')

  const [items, settings, products, services] = await Promise.all([
    prisma.announcementItem.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
    getSiteSettings(),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, nameAr: true, nameEn: true },
      orderBy: { nameAr: 'asc' },
      take: 100,
    }),
    prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  return {
    items,
    active: settings?.announcementActive ?? true,
    bgColor: settings?.announcementBgColor || '#2B71AE',
    products,
    services,
  }
})
