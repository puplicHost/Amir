import { generateSlug } from '../../../../shared/slug'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const existing = await prisma.product.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  const changes: string[] = []
  const data: Record<string, unknown> = {}
  if (body.nameAr !== undefined && String(body.nameAr).trim() !== existing.nameAr) {
    data.nameAr = String(body.nameAr).trim()
    changes.push('Updated name')
  }
  if (body.nameEn !== undefined && String(body.nameEn).trim() !== existing.nameEn) {
    data.nameEn = String(body.nameEn).trim()
    if (!changes.includes('Updated name')) changes.push('Updated name')
  }
  if (body.descriptionAr !== undefined || body.descriptionEn !== undefined) {
    const newAr = body.descriptionAr !== undefined ? (body.descriptionAr || null) : existing.descriptionAr
    const newEn = body.descriptionEn !== undefined ? (body.descriptionEn || null) : existing.descriptionEn
    if (newAr !== existing.descriptionAr || newEn !== existing.descriptionEn) changes.push('Updated description')
    if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr || null
    if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn || null
  }
  if (body.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Valid price is required' })
    if (price !== Number(existing.price)) changes.push('Updated price')
    data.price = price
  }
  if (body.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: String(body.categoryId) } })
    if (!category) throw createError({ statusCode: 400, statusMessage: 'Category not found' })
    if (category.id !== existing.categoryId) changes.push('Changed category')
    data.categoryId = category.id
  }
  if (body.isActive !== undefined) {
    const next = body.isActive === true
    if (next !== existing.isActive) changes.push(next ? 'Activated product' : 'Deactivated product')
    data.isActive = next
  }
  if (body.featuredOnHomepage !== undefined) {
    const next = body.featuredOnHomepage === true
    if (next !== existing.featuredOnHomepage) changes.push(next ? 'Featured on homepage' : 'Removed from homepage')
    data.featuredOnHomepage = next
  }
  if (body.slug !== undefined && String(body.slug).trim() && String(body.slug).trim() !== existing.slug) {
    const base = generateSlug(String(body.slug))
    const clash = await prisma.product.findUnique({ where: { slug: base } })
    if (clash) throw createError({ statusCode: 409, statusMessage: 'Slug already in use' })
    data.slug = base
    changes.push('Updated slug')
  }
  if (body.attributes !== undefined) changes.push('Updated attributes')
  if (body.seo !== undefined) changes.push('Updated SEO')

  if (body.featuredOnHomepage === true) {
    const current = await prisma.product.findUnique({
      where: { id: id || '' },
      select: { isActive: true },
    })
    if (!current?.isActive) {
      throw createError({
        statusCode: 400,
        message: 'Cannot feature an inactive product',
      })
    }
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
  if (changes.length) {
    await logAudit({
      entityType: 'product',
      entityId: existing.id,
      entityName: `${String(data.nameAr ?? existing.nameAr)} / ${String(data.nameEn ?? existing.nameEn)}`,
      action: 'updated',
      details: changes.join(', '),
      user: actor,
    })
  }
  return { product: result }
})
