interface AttrFilter {
  key?: string
  value?: string
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 16))
  const where: Record<string, unknown> = { isActive: true }

  if (typeof q.category === 'string' && q.category) {
    const cat = await prisma.category.findUnique({ where: { slug: q.category } })
    if (!cat) return { products: [], total: 0, page, limit, pages: 0 }
    where.categoryId = cat.id
  }
  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { nameEn: { contains: s, mode: 'insensitive' } },
      { nameAr: { contains: s, mode: 'insensitive' } },
    ]
  }
  const price: Record<string, number> = {}
  if (q.minPrice !== undefined && q.minPrice !== '') price.gte = Number(q.minPrice)
  if (q.maxPrice !== undefined && q.maxPrice !== '') price.lte = Number(q.maxPrice)
  if (Object.keys(price).length) where.price = price

  if (typeof q.attributes === 'string' && q.attributes) {
    try {
      const filters = JSON.parse(q.attributes) as AttrFilter[]
      const and = (Array.isArray(filters) ? filters : [])
        .filter(f => f.key || f.value)
        .map(f => ({
          attributes: {
            some: {
              ...(f.key ? { keyEn: { contains: String(f.key), mode: 'insensitive' as const } } : {}),
              ...(f.value ? { valueEn: { contains: String(f.value), mode: 'insensitive' as const } } : {}),
            },
          },
        }))
      if (and.length) where.AND = and
    }
    catch { /* ignore malformed filter */ }
  }

  const orderBy = q.sort === 'price_asc'
    ? { price: 'asc' as const }
    : q.sort === 'price_desc'
      ? { price: 'desc' as const }
      : { createdAt: 'desc' as const }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        price: true,
        compareAtPrice: true,
        category: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
        images: { where: { isCover: true }, take: 1, select: { path: true } },
      },
    }),
  ])

  return {
    products: products.map(p => ({ ...p, coverImage: p.images[0]?.path || null, images: undefined })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  }
})
