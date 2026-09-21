import { generateSlug } from '../../../../shared/slug'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'categories.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const existing = await prisma.category.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  const data: Record<string, unknown> = {}
  if (body.nameAr !== undefined) data.nameAr = String(body.nameAr).trim()
  if (body.nameEn !== undefined) data.nameEn = String(body.nameEn).trim()
  if (!data.nameAr && existing.nameAr === '') throw createError({ statusCode: 400, statusMessage: 'Arabic name is required' })
  if (body.slug !== undefined && String(body.slug).trim() && String(body.slug).trim() !== existing.slug) {
    const base = generateSlug(String(body.slug))
    const clash = await prisma.category.findUnique({ where: { slug: base } })
    if (clash) throw createError({ statusCode: 409, statusMessage: 'Slug already in use' })
    data.slug = base
  }
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr || null
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn || null
  if (body.coverVideoUrl !== undefined) data.coverVideoUrl = body.coverVideoUrl || null
  if (body.featuredOnHomepage !== undefined) data.featuredOnHomepage = body.featuredOnHomepage === true
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

  const category = await prisma.category.update({ where: { id: existing.id }, data })
  return { category }
})
