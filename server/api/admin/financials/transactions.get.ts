export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  const isFullYear = q.month !== undefined && Number(q.month) === 0
  const month = isFullYear ? 1 : Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const limit = Math.min(10, Math.max(1, Number(q.limit) || 5))
  const pay = q.pay === 'COD' || q.pay === 'ONLINE' ? String(q.pay) : null

  const start = isFullYear ? new Date(year, 0, 1) : new Date(year, month - 1, 1)
  const end = isFullYear ? new Date(year + 1, 0, 1) : new Date(year, month, 1)

  const orders = await prisma.order.findMany({
    where: {
      status: 'Delivered',
      updatedAt: { gte: start, lt: end },
      ...(pay ? { paymentMethod: pay } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      paymentMethod: true,
      totalAmount: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  })

  return {
    transactions: orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      paymentMethod: o.paymentMethod,
      total: Number(o.totalAmount),
      itemCount: o._count.items,
      deliveredAt: o.updatedAt,
    })),
  }
})
