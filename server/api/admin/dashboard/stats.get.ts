export default defineEventHandler(async (event) => {
  // Any admin user can view the dashboard stats, so we just require auth.
  await requireAuth(event)

  const [totalOrders, pendingOrders, newServiceRequests, totalProducts] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'Pending' } }),
    prisma.serviceRequest.count({ where: { status: 'New' } }),
    prisma.product.count(),
  ])

  return {
    stats: {
      totalOrders,
      pendingOrders,
      newServiceRequests,
      totalProducts,
    },
  }
})
