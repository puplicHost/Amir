export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const canView = user.isSuper ||
    user.permissions.includes('inventory.view') ||
    user.permissions.includes('products.view')
  if (!canView) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = [10, 20, 50].includes(Number(q.perPage)) ? Number(q.perPage) : 20
  const lowStockOnly = q.lowStock === 'true' || q.lowStock === '1'
  const search = typeof q.search === 'string' ? q.search.trim() : ''

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { nameEn: { contains: search, mode: 'insensitive' } },
      { nameAr: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ]
  }

  const all = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      price: true,
      costPrice: true,
      stock: true,
      minStock: true,
      isActive: true,
      category: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { path: true } },
    },
  })

  const withStatus = all.map((p) => {
    const stock = p.stock ?? 0
    const minStock = p.minStock ?? 0
    const cost = p.costPrice === null || p.costPrice === undefined ? 0 : Number(p.costPrice)
    const status = stock === 0 ? 'out' : stock <= minStock ? 'low' : 'ok'
    return {
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      slug: p.slug,
      price: Number(p.price),
      costPrice: p.costPrice === null ? null : Number(p.costPrice),
      stock,
      minStock,
      isActive: p.isActive,
      category: p.category,
      coverImage: p.images[0]?.path || null,
      stockValue: Math.round(cost * stock * 100) / 100,
      status,
    }
  })

  const filtered = lowStockOnly ? withStatus.filter(p => p.status !== 'ok') : withStatus
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)
  const data = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  // Global summary (unfiltered) for the footer cards.
  let totalValue = 0
  let activeCount = 0
  let lowCount = 0
  for (const p of withStatus) {
    totalValue += p.stockValue
    if (p.isActive) activeCount++
    if (p.status !== 'ok') lowCount++
  }

  return {
    data,
    meta: {
      total,
      page: safePage,
      perPage,
      totalPages,
    },
    summary: {
      totalValue: Math.round(totalValue * 100) / 100,
      activeCount,
      lowCount,
      totalCount: withStatus.length,
    },
  }
})
