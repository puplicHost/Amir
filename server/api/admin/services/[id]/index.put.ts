import { logAudit } from '../../../../utils/audit'
import { parseBody, serviceUpdateSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.manage')
  const id = getRouterParam(event, 'id')
  const body = await parseBody(event, serviceUpdateSchema)

  const existing = await prisma.service.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Service not found' })

  const data: Record<string, unknown> = {}
  if (body.section !== undefined) data.section = body.section
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.nameEn !== undefined) data.nameEn = body.nameEn?.trim() || null
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn
  if (body.priceAbCents !== undefined) data.priceAbCents = body.priceAbCents
  if (body.durationMin !== undefined) data.durationMin = body.durationMin
  if (body.needsDurationReview !== undefined) data.needsDurationReview = body.needsDurationReview
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.showOnHome !== undefined) data.featuredOnHomepage = body.showOnHome === true
  if (body.featuredOnHomepage !== undefined) data.featuredOnHomepage = body.featuredOnHomepage === true

  const rawSlug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : ''
  if (rawSlug && rawSlug !== existing.slug) {
    const clash = await prisma.service.findUnique({ where: { slug: rawSlug } })
    if (clash) throw createError({ statusCode: 409, statusMessage: 'Slug already in use' })
    data.slug = rawSlug
  }

  const service = await prisma.service.update({ where: { id: existing.id }, data })
  await logAudit({
    entityType: 'service',
    entityId: existing.id,
    entityName: service.name,
    action: 'updated',
    details: 'Updated service',
    user: actor,
  })
  return { service }
})
