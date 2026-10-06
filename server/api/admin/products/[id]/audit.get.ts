export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.view')
  const id = getRouterParam(event, 'id')
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(20, Math.max(1, Number(q.limit) || 20))

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where: { entityType: 'product', entityId: id || '' } }),
    prisma.auditLog.findMany({
      where: { entityType: 'product', entityId: id || '' },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])
  return { logs, total, page, limit, pages: Math.ceil(total / limit) }
})
