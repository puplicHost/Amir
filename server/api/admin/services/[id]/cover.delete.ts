import { deleteServiceCoverFile } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.manage')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.service.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Service not found' })

  if (existing.coverImagePath) {
    await prisma.service.update({
      where: { id: existing.id },
      data: { coverImagePath: null },
    })
    await deleteServiceCoverFile(existing.coverImagePath)
    await logAudit({
      entityType: 'service',
      entityId: existing.id,
      entityName: existing.name,
      action: 'media',
      details: 'Removed service cover image',
      user: actor,
    })
  }
  return { service: { ...existing, coverImagePath: null } }
})
