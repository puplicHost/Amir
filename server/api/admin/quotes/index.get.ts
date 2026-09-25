export default defineEventHandler(async (event) => {
  // Allow users with quotes.view or services.view or orders.view
  const user = await requireAuth(event)
  const hasAccess = user.isSuper || 
    user.permissions.includes('quotes.view') || 
    user.permissions.includes('services.view') || 
    user.permissions.includes('orders.view')

  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))

  const where: Record<string, unknown> = {}

  if (typeof q.status === 'string' && q.status) {
    where.status = q.status
  }

  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { quoteNumber: { contains: s, mode: 'insensitive' } },
      { companyName: { contains: s, mode: 'insensitive' } },
      { contactName: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
    ]
  }

  const [total, quotes] = await Promise.all([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { items: true } },
      },
    }),
  ])

  return { quotes, total, page, limit, pages: Math.ceil(total / limit) }
})
