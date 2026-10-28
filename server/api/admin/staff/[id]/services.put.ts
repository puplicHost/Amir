import { requirePermission } from '../../../../utils/auth'
import { parseBody, staffServicesSchema } from '../../../../utils/validate'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, staffServicesSchema)

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  if (target.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target user is not a staff member' })
  }
  if (body.serviceIds.length) {
    const found = await prisma.service.count({ where: { id: { in: [...new Set(body.serviceIds)] } } })
    if (found !== new Set(body.serviceIds).size) {
      throw createError({ statusCode: 400, statusMessage: 'One or more services do not exist' })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffService.deleteMany({ where: { staffId: target.id } })
    if (body.serviceIds.length) {
      await tx.staffService.createMany({
        data: [...new Set(body.serviceIds)].map(serviceId => ({ staffId: target.id, serviceId })),
      })
    }
  })
  await logAudit({
    entityType: 'staff',
    entityId: target.id,
    entityName: target.name,
    action: 'updated',
    details: body.serviceIds.length
      ? `Restricted to ${new Set(body.serviceIds).size} service(s)`
      : 'Reset to all services',
    user,
  })
  return { success: true, serviceIds: [...new Set(body.serviceIds)] }
})
