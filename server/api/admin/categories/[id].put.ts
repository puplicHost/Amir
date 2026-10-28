import { generateSlug } from '../../../../shared/slug'
import { logAudit } from '../../../utils/audit'
import { categoryUpdateSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'categories.manage')
  const id = getRouterParam(event, 'id')
  // AUDIT P3-08: validated partial update.
  const body = await parseBody(event, categoryUpdateSchema)

  const existing = await prisma.category.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  const data: Record<string, unknown> = {}
  if (body.nameAr !== undefined) data.nameAr = body.nameAr
  if (body.nameEn !== undefined) data.nameEn = body.nameEn
  if (body.slug !== undefined && body.slug && body.slug !== existing.slug) {
    const base = generateSlug(body.slug)
    const clash = await prisma.category.findUnique({ where: { slug: base } })
    if (clash) throw createError({ statusCode: 409, statusMessage: 'Slug already in use' })
    data.slug = base
  }
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr || null
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn || null
  // AUDIT P2-11: optional German copy; blank clears it (fallback to EN).
  if (body.nameDe !== undefined) {
    data.nameDe = typeof body.nameDe === 'string' && body.nameDe.trim() ? body.nameDe.trim() : null
  }
  if (body.descriptionDe !== undefined) {
    data.descriptionDe = typeof body.descriptionDe === 'string' && body.descriptionDe.trim() ? body.descriptionDe : null
  }
  if (body.coverVideoUrl !== undefined) data.coverVideoUrl = body.coverVideoUrl || null
  if (body.showOnHome !== undefined) data.featuredOnHomepage = body.showOnHome === true
  if (body.featuredOnHomepage !== undefined) data.featuredOnHomepage = body.featuredOnHomepage === true
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

  const category = await prisma.category.update({ where: { id: existing.id }, data })
  await logAudit({
    entityType: 'category',
    entityId: existing.id,
    entityName: `${category.nameAr} / ${category.nameEn}`,
    action: 'updated',
    details: 'Updated category',
    user: actor,
  })
  return { category }
})
