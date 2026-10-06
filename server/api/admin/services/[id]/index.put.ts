
import { logAudit } from '../../../../utils/audit'
import { parseBody, serviceUpdateSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.config')
  const id = event.context.params?.id
  const body = await parseBody(event, serviceUpdateSchema)
  const service = await prisma.service.update({
    where: { id },
    data: {
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      iconPath: body.iconPath,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
    }
  })
  await logAudit({
    entityType: 'service',
    entityId: service.id,
    entityName: `${service.nameAr} / ${service.nameEn}`,
    action: 'updated',
    details: 'عدّل الخدمة',
    user: actor,
  })
  return service
})
