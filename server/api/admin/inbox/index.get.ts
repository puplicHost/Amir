export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inbox.manage')

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))

  const where: Record<string, unknown> = {}
  if (query.isRead === 'true') where.isRead = true
  else if (query.isRead === 'false') where.isRead = false

  const [total, unreadCount, rows] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { ...where, isRead: false } }),
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    messages: rows,
    unreadCount,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  }
})
