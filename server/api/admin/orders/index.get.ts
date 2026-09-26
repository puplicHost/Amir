export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders.view')
  const canViewFinancials = user.isSuper || user.permissions.includes('dashboard.financials.view')
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 25))
  
  const where: Record<string, unknown> = {}
  
  if (typeof q.status === 'string' && q.status) {
    where.status = q.status
  }
  if (typeof q.paymentMethod === 'string' && q.paymentMethod) {
    where.paymentMethod = q.paymentMethod
  }
  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { orderNumber: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
      { customerPhone: { contains: s, mode: 'insensitive' } },
    ]
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { items: true } },
      },
    }),
  ])
  
  const mappedOrders = orders.map(o => ({
    ...o,
    totalAmount: canViewFinancials ? o.totalAmount : null,
  }))

  return { orders: mappedOrders, total, page, limit, pages: Math.ceil(total / limit) }
})
