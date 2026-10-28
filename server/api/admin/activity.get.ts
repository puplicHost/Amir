export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['activity.view_all', 'activity.view_own'])

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 7))
  const entityTypes = ['product', 'category', 'service', 'booking', 'staff', 'expense', 'expense-category']
  const actions = ['created', 'updated', 'deleted', 'media']
  const where: Record<string, unknown> = {}
  // AUDIT P3-09: explicit activity permissions replace the previous implicit
  // "any authenticated user" access. Users without company-wide visibility
  // only see their own audit entries.
  const canViewAll = user.isSuper || user.permissions.includes('activity.view_all')
  if (!canViewAll) where.userId = user.userId
  if (typeof query.entityType === 'string' && entityTypes.includes(query.entityType)) {
    where.entityType = query.entityType
  }
  if (typeof query.action === 'string' && actions.includes(query.action)) {
    where.action = query.action
  }

  const [total, activities] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        entityName: true,
        action: true,
        details: true,
        userName: true,
        createdAt: true,
      },
    }),
  ])

  return {
    activities,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  }
})
