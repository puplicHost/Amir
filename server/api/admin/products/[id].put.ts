import { generateSlug } from '../../../../shared/slug'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.edit')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const existing = await prisma.product.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  const data: Record<string, unknown> = {}
  if (body.nameAr !== undefined) data.nameAr = String(body.nameAr).trim()
  if (body.nameEn !== undefined) data.nameEn = String(body.nameEn).trim()
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr || null
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn || null
  if (body.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Valid price is required' })
    data.price = price
  }
  if (body.compareAtPrice !== undefined) {
    const current = (data.price as number | undefined) ?? Number(existing.price)
    const compareAt = body.compareAtPrice === '' || body.compareAtPrice === null ? null : Number(body.compareAtPrice)
    if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt <= current)) {
      throw createError({ statusCode: 400, statusMessage: 'Compare-at price must be greater than price' })
    }
    data.compareAtPrice = compareAt
  }
  if (body.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: String(body.categoryId) } })
    if (!category) throw createError({ statusCode: 400, statusMessage: 'Category not found' })
    data.categoryId = category.id
  }
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.slug !== undefined && String(body.slug).trim() && String(body.slug).trim() !== existing.slug) {
    const base = generateSlug(String(body.slug))
    const clash = await prisma.product.findUnique({ where: { slug: base } })
    if (clash) throw createError({ statusCode: 409, statusMessage: 'Slug already in use' })
    data.slug = base
  }

  const result = await prisma.$transaction(async (tx) => {
    if (body.attributes !== undefined) {
      const attrs = (Array.isArray(body.attributes) ? body.attributes : [])
        .filter((a: Record<string, unknown>) => a && (a.keyEn || a.keyAr))
        .map((a: Record<string, unknown>) => ({
          keyAr: String(a.keyAr || a.keyEn || ''),
          keyEn: String(a.keyEn || a.keyAr || ''),
          valueAr: String(a.valueAr ?? a.valueEn ?? ''),
          valueEn: String(a.valueEn ?? a.valueAr ?? ''),
        }))
      await tx.productAttribute.deleteMany({ where: { productId: existing.id } })
      if (attrs.length) await tx.productAttribute.createMany({ data: attrs.map(a => ({ ...a, productId: existing.id })) })
    }
    if (body.seo !== undefined && body.seo && typeof body.seo === 'object') {
      const s = body.seo as Record<string, unknown>
      const seoData: Record<string, string | null> = {}
      for (const k of ['metaTitleAr', 'metaTitleEn', 'metaDescriptionAr', 'metaDescriptionEn', 'keywords', 'geoContent']) {
        if (s[k] !== undefined) seoData[k] = s[k] ? String(s[k]) : null
      }
      await tx.productSeo.upsert({
        where: { productId: existing.id },
        update: seoData,
        create: { productId: existing.id, ...seoData },
      })
    }
    return tx.product.update({
      where: { id: existing.id },
      data,
      include: { attributes: true, seo: true, images: { orderBy: { sortOrder: 'asc' } } },
    })
  })
  return { product: result }
})
