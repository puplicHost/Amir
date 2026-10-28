export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.view')
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))
  const where: Record<string, unknown> = {}

  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { nameEn: { contains: s, mode: 'insensitive' } },
      { nameAr: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
      { seo: { is: { keywords: { contains: s, mode: 'insensitive' } } } },
    ]
  }
  if (typeof q.categoryId === 'string' && q.categoryId) where.categoryId = q.categoryId
  if (q.status === 'active') where.isActive = true
  if (q.status === 'inactive') where.isActive = false

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: { select: { id: true, slug: true, nameAr: true, nameEn: true, nameDe: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        seo: { select: { keywords: true } },
      },
    }),
  ])

  // Latest audit entry per listed product (for the "Last modified" column).
  const ids = products.map(p => p.id)
  const recentLogs = ids.length
    ? await prisma.auditLog.findMany({
        where: { entityType: 'product', entityId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        take: ids.length * 4,
        select: { entityId: true, action: true, details: true, userName: true, createdAt: true },
      })
    : []
  const lastAuditById: Record<string, (typeof recentLogs)[number]> = {}
  for (const log of recentLogs) {
    if (!lastAuditById[log.entityId]) lastAuditById[log.entityId] = log
  }
  const withAudit = products.map(p => ({ ...p, lastAudit: lastAuditById[p.id] || null }))

  return { products: withAudit, total, page, limit, pages: Math.ceil(total / limit) }
})
