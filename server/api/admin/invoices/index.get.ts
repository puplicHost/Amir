export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.view')
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))
  const where: Record<string, unknown> = {}

  if (typeof q.status === 'string' && q.status) where.status = q.status
  if (typeof q.type === 'string' && q.type) where.type = q.type
  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { invoiceNumber: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
      { customerPhone: { contains: s, mode: 'insensitive' } },
    ]
  }
  if (typeof q.dateFrom === 'string' && q.dateFrom) {
    const from = new Date(q.dateFrom)
    if (!Number.isNaN(from.getTime())) {
      (where as any).createdAt = { ...((where as any).createdAt || {}), gte: from }
    }
  }
  if (typeof q.dateTo === 'string' && q.dateTo) {
    const to = new Date(q.dateTo)
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999)
      ;(where as any).createdAt = { ...((where as any).createdAt || {}), lte: to }
    }
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { items: true } } },
    }),
  ])
  const rows = invoices.map(i => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customerName: i.customerName,
    customerPhone: i.customerPhone,
    customerGovernorat: i.customerGovernorat,
    paymentMethod: i.paymentMethod,
    status: i.status,
    subtotalAmount: Number(i.subtotalAmount),
    taxAmount: Number(i.taxAmount),
    totalAmount: Number(i.totalAmount),
    type: i.type,
    orderId: i.orderId,
    quoteId: i.quoteId,
    createdAt: i.createdAt,
    itemCount: (i as any)._count.items,
  }))
  return { invoices: rows, total, page, limit, pages: Math.ceil(total / limit) }
})
