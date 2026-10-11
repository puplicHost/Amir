import { deletedLabel, logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.manage')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.service.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Service not found' })
  await prisma.service.delete({ where: { id: existing.id } })
  await logAudit({
    entityType: 'service',
    entityId: existing.id,
    entityName: existing.name,
    action: 'deleted',
    details: deletedLabel('service'),
    user: actor,
  })
  return { ok: true }
})
