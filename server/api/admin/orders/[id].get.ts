export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders.view')
  const canViewFinancials = user.isSuper || user.permissions.includes('dashboard.financials.view')
  const id = getRouterParam(event, 'id')
  
  const order = await prisma.order.findUnique({
    where: { id: id || '' },
    include: {
      items: true,
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        include: { changedBy: { select: { name: true } } },
      },
    },
  })
  
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  if (!canViewFinancials) {
    return {
      order: {
        ...order,
        totalAmount: null,
        items: order.items.map(item => ({
          ...item,
          productPriceSnapshot: null,
          subtotal: null,
        })),
      },
    }
  }

  return { order }
})
