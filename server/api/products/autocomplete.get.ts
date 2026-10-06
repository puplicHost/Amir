export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || query.search || '').trim()
  if (!q) {
    return { results: [], total: 0 }
  }

  const where = {
    isActive: true,
    OR: [
      { nameEn: { contains: q, mode: 'insensitive' as const } },
      { nameAr: { contains: q, mode: 'insensitive' as const } },
      { slug: { contains: q, mode: 'insensitive' as const } },
      { category: { is: { nameEn: { contains: q, mode: 'insensitive' as const } } } },
      { category: { is: { nameAr: { contains: q, mode: 'insensitive' as const } } } },
      { seo: { is: { keywords: { contains: q, mode: 'insensitive' as const } } } },
    ],
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        price: true,
        compareAtPrice: true,
        category: {
          select: {
            slug: true,
            nameAr: true,
            nameEn: true,
          },
        },
        images: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { path: true },
        },
      },
    }),
  ])

  const results = products.map(p => ({
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    category: p.category,
    coverImage: p.images[0]?.path || null,
  }))

  return { results, total }
})
