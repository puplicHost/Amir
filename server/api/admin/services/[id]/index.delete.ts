
import { deletedLabel, logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.config')
  const id = event.context.params?.id

  const requestsCount = await prisma.serviceRequest.count({ where: { serviceId: id } })
  if (requestsCount > 0) {
    throw createError({ statusCode: 400, message: 'Cannot delete service with existing requests.' })
  }

  const existing = await prisma.service.findUnique({ where: { id }, select: { nameAr: true, nameEn: true } })
  await prisma.service.delete({ where: { id } })
  await logAudit({
    entityType: 'service',
    entityId: String(id),
    entityName: existing ? `${existing.nameAr} / ${existing.nameEn}` : String(id),
    action: 'deleted',
    details: deletedLabel('service'),
    user: actor,
  })
  return { success: true }
})
