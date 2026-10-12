// Featured services for the homepage (mirrors /api/categories/featured).
// Returns active services flagged in Admin → Services, ordered by sortOrder.
// Falls back to other active services when fewer than 3 are featured so the
// homepage never goes empty on a fresh database.
export default defineEventHandler(async () => {
  let services = await prisma.service.findMany({
    where: { isActive: true, featuredOnHomepage: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: 6,
  })

  if (services.length < 3) {
    const existingIds = services.map(s => s.id)
    const extra = await prisma.service.findMany({
      where: existingIds.length > 0
        ? { isActive: true, id: { notIn: existingIds } }
        : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 6 - services.length,
    })
    services = [...services, ...extra]
  }

  return { services }
})
