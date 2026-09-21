export default defineEventHandler(async (event) => {
  await requirePermission(event, 'orders.view')
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
  return { order }
})
