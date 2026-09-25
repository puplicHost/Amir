export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  const where: Record<string, unknown> = {}
  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { nameEn: { contains: s, mode: 'insensitive' } },
      { nameAr: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
    ]
  }

  const select = {
    id: true,
    nameAr: true,
    nameEn: true,
    slug: true,
    descriptionAr: true,
    descriptionEn: true,
    coverImagePath: true,
    coverVideoUrl: true,
    featuredOnHomepage: true,
    sortOrder: true,
    _count: { select: { products: { where: { isActive: true } } } },
  }

  // Pagination is opt-in: only when `page` or `limit` query params are present.
  // This keeps existing callers (navbar dropdown, filter chips) on the full list.
  const hasPagination = q.page !== undefined || q.limit !== undefined
  if (!hasPagination) {
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      select,
    })
    return { categories }
  }

  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))

  const [total, categories] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select,
    }),
  ])
  return { categories, total, page, limit, pages: Math.ceil(total / limit) }
})
