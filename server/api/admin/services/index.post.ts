import { createdLabel, logAudit } from '../../../utils/audit'
import { parseBody, serviceCreateSchema } from '../../../utils/validate'

function slugify(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.manage')
  const body = await parseBody(event, serviceCreateSchema)
  let slug = typeof body.slug === 'string' && body.slug.trim()
    ? slugify(body.slug)
    : (body.name ? slugify(body.name) : `service-${Date.now()}`)
  if (!slug) slug = `service-${Date.now()}`
  const clash = await prisma.service.findUnique({ where: { slug } })
  if (clash) throw createError({ statusCode: 409, statusMessage: 'Slug already in use' })

  const service = await prisma.service.create({
    data: {
      slug,
      section: body.section,
      name: body.name,
      description: body.description ?? null,
      priceAbCents: body.priceAbCents,
      durationMin: body.durationMin ?? 30,
      needsDurationReview: body.needsDurationReview ?? true,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      featuredOnHomepage: body.featuredOnHomepage ?? body.showOnHome ?? false,
    },
  })
  await logAudit({
    entityType: 'service',
    entityId: service.id,
    entityName: service.name,
    action: 'created',
    details: createdLabel('service'),
    user: actor,
  })
  return service
})
