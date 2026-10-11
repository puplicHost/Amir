export default defineEventHandler(async (event) => {
  // Any authenticated admin user can view the dashboard stats
  await requireAuth(event)

  const [
    totalProducts,
    totalCategories,
    activeServices,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.service.count({ where: { isActive: true } }),
  ])

  return {
    stats: {
      totalProducts,
      totalCategories,
      activeServices,
    },
  }
})
