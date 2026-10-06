
import { createdLabel, logAudit } from '../../../utils/audit'
import { parseBody, serviceCreateSchema } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.config')
  const body = await parseBody(event, serviceCreateSchema)
  let slug = typeof body.slug === 'string' && body.slug.trim()
    ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : (body.nameEn ? body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `service-${Date.now()}`)

  const service = await prisma.service.create({
    data: {
      slug,
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      iconPath: body.iconPath,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : false,
    }
  })
  await logAudit({
    entityType: 'service',
    entityId: service.id,
    entityName: `${service.nameAr} / ${service.nameEn}`,
    action: 'created',
    details: createdLabel('service'),
    user: actor,
  })
  return service
})
