// Featured services for the homepage (mirrors /api/categories/featured).
// Returns active services flagged in Admin → Services, ordered by sortOrder.
export default defineEventHandler(async () => {
  let services = await prisma.service.findMany({
    where: { isActive: true, featuredOnHomepage: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: 6,
  })

  return { services }
})
