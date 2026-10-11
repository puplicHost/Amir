import { generateSlug, uniqueSlug } from '../../../../shared/slug'
import { createdLabel, logAudit } from '../../../utils/audit'

interface AttrInput {
  keyAr?: string
  keyEn?: string
  valueAr?: string
  valueEn?: string
}

interface SeoInput {
  metaTitleAr?: string
  metaTitleEn?: string
  metaDescriptionAr?: string
  metaDescriptionEn?: string
  keywords?: string
  geoContent?: string
}

function cleanAttributes(input: unknown): AttrInput[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(a => a && (a.keyEn || a.keyAr))
    .map(a => ({
      keyAr: String(a.keyAr || a.keyEn || ''),
      keyEn: String(a.keyEn || a.keyAr || ''),
      valueAr: String(a.valueAr ?? a.valueEn ?? ''),
      valueEn: String(a.valueEn ?? a.valueAr ?? ''),
    }))
}

function cleanSeo(input: unknown): SeoInput | null {
  if (!input || typeof input !== 'object') return null
  const s = input as Record<string, unknown>
  const out: SeoInput = {}
  for (const k of ['metaTitleAr', 'metaTitleEn', 'metaDescriptionAr', 'metaDescriptionEn', 'keywords', 'geoContent'] as const) {
    if (s[k] !== undefined) out[k] = String(s[k] || '') || undefined
  }
  return Object.keys(out).length ? out : null
}

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.manage')
  const body = await readBody(event)

  const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : ''
  const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : ''
  if (!nameAr || !nameEn) throw createError({ statusCode: 400, statusMessage: 'Arabic and English names are required' })
  if (!body.categoryId) throw createError({ statusCode: 400, statusMessage: 'Category is required' })

  const category = await prisma.category.findUnique({ where: { id: String(body.categoryId) } })
  if (!category) throw createError({ statusCode: 400, statusMessage: 'Category not found' })

  const price = Number(body.price)
  if (!Number.isFinite(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Valid price is required' })

  const base = typeof body.slug === 'string' && body.slug.trim() ? generateSlug(body.slug) : generateSlug(nameEn)
  const slug = await uniqueSlug(base, async s => !!(await prisma.product.findUnique({ where: { slug: s } })))
  const seo = cleanSeo(body.seo)

  const product = await prisma.product.create({
    data: {
      nameAr,
      nameEn,
      slug,
      descriptionAr: body.descriptionAr || null,
      descriptionEn: body.descriptionEn || null,
      price,
      categoryId: category.id,
      isActive: body.isActive !== false,
      attributes: { create: cleanAttributes(body.attributes) },
      ...(seo ? { seo: { create: seo } } : {}),
    },
    include: { attributes: true, seo: true, images: true },
  })
  await logAudit({
    entityType: 'product',
    entityId: product.id,
    entityName: `${nameAr} / ${nameEn}`,
    action: 'created',
    details: createdLabel('product'),
    user: actor,
  })
  return { product }
})
