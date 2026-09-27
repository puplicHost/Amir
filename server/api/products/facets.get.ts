export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const where: Record<string, unknown> = { isActive: true }

  if (typeof q.category === 'string' && q.category) {
    const cat = await prisma.category.findUnique({ where: { slug: q.category } })
    if (!cat) {
      return {
        minPrice: 0,
        maxPrice: 0,
        attributes: [],
      }
    }
    where.categoryId = cat.id
  }

  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { nameEn: { contains: s, mode: 'insensitive' } },
      { nameAr: { contains: s, mode: 'insensitive' } },
    ]
  }

  const [priceAgg, rawAttributes] = await Promise.all([
    prisma.product.aggregate({
      where,
      _min: { price: true },
      _max: { price: true },
    }),
    prisma.productAttribute.findMany({
      where: {
        product: where,
      },
      select: {
        keyEn: true,
        keyAr: true,
        valueEn: true,
        valueAr: true,
      },
    }),
  ])

  // Group attributes by keyEn
  const groupMap = new Map<string, {
    keyEn: string
    keyAr: string
    valuesMap: Map<string, { valueEn: string, valueAr: string, count: number }>
  }>()

  for (const attr of rawAttributes) {
    const kEn = attr.keyEn.trim()
    if (!kEn) continue
    if (!groupMap.has(kEn)) {
      groupMap.set(kEn, {
        keyEn: kEn,
        keyAr: attr.keyAr.trim() || kEn,
        valuesMap: new Map(),
      })
    }
    const group = groupMap.get(kEn)!
    const vEn = attr.valueEn.trim()
    if (!vEn) continue

    if (!group.valuesMap.has(vEn)) {
      group.valuesMap.set(vEn, {
        valueEn: vEn,
        valueAr: attr.valueAr.trim() || vEn,
        count: 1,
      })
    }
    else {
      group.valuesMap.get(vEn)!.count++
    }
  }

  const attributes = Array.from(groupMap.values()).map(g => ({
    keyEn: g.keyEn,
    keyAr: g.keyAr,
    values: Array.from(g.valuesMap.values()).sort((a, b) => b.count - a.count),
  }))

  // Priority ordering: Voltage and Brand facets (the two most-used filters
  // for electrical/industrial components) surface first, in both languages.
  // Remaining groups keep their natural order (stable sort).
  function facetPriority(keyEn: string, keyAr: string): number {
    const k = `${keyEn} ${keyAr}`
    if (/volt|فولت|جهد/i.test(k)) return 0
    if (/brand|manufacturer|العلامة|الماركة|الشركة المصنعة/i.test(k)) return 1
    return 2
  }
  attributes.sort((a, b) => facetPriority(a.keyEn, a.keyAr) - facetPriority(b.keyEn, b.keyAr))

  const minPrice = priceAgg._min.price ? Math.floor(Number(priceAgg._min.price)) : 0
  const maxPrice = priceAgg._max.price ? Math.ceil(Number(priceAgg._max.price)) : 0

  return {
    minPrice,
    maxPrice,
    attributes,
  }
})
