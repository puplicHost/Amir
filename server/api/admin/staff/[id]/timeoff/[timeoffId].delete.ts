import { requirePermission } from '../../../../../utils/auth'
import { logAudit } from '../../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const timeoffId = getRouterParam(event, 'timeoffId') || ''

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  const row = await prisma.staffTimeOff.findFirst({ where: { id: timeoffId, staffId: target.id } })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Absence entry not found' })
  await prisma.staffTimeOff.delete({ where: { id: row.id } })
  await logAudit({
    entityType: 'staff',
    entityId: target.id,
    entityName: target.name,
    action: 'updated',
    details: 'Removed an absence entry',
    user,
  })
  return { success: true }
})
